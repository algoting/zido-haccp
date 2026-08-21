import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../exports/gcs.service';
import { LocalFileService } from '../exports/local-file.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PmsService {
  private readonly logger = new Logger(PmsService.name);
  private gcsEnabled: boolean;

  constructor(
    private prisma: PrismaService,
    private gcs: GcsService,
    private localFile: LocalFileService,
    private config: ConfigService,
  ) {
    // Check if GCS is enabled
    const projectId = this.config.get<string>('GCP_PROJECT_ID');
    const keyFile = this.config.get<string>('GCP_KEY_FILE');
    this.gcsEnabled = !!(projectId && keyFile);
  }

  async uploadDocument(
    establishmentId: string,
    userId: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    notes?: string,
  ) {
    // Check current number of documents
    const existingCount = await this.prisma.pmsDocument.count({
      where: { establishmentId },
    });

    if (existingCount >= 5) {
      throw new BadRequestException(
        'Maximum 5 documents PMS autorisés par établissement',
      );
    }

    // Upload file to GCS or local storage
    let fileUrl: string;
    if (this.gcsEnabled) {
      fileUrl = await this.gcs.uploadPmsDocument(
        establishmentId,
        originalName,
        fileBuffer,
      );
    } else {
      // Fall back to local file storage - preserve file extension
      const ext = originalName
        .substring(originalName.lastIndexOf('.'))
        .toLowerCase();
      const nameWithoutExt = originalName
        .substring(0, originalName.lastIndexOf('.'))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_');
      const sanitizedName = nameWithoutExt + ext;
      fileUrl = this.localFile.uploadPmsDocument(
        establishmentId,
        sanitizedName,
        fileBuffer,
      );
      this.logger.log(`PMS document saved locally: ${fileUrl}`);
    }

    const document = await this.prisma.pmsDocument.create({
      data: {
        establishmentId,
        fileUrl,
        originalName,
        notes,
        uploadedByUserId: userId,
      },
    });

    return document;
  }

  async getDocument(establishmentId: string) {
    // Return all documents for the establishment, sorted by upload date (newest first)
    return this.prisma.pmsDocument.findMany({
      where: { establishmentId },
      include: { establishment: { select: { name: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async getDocumentById(documentId: string, establishmentId: string) {
    return this.prisma.pmsDocument.findFirstOrThrow({
      where: { id: documentId, establishmentId },
    });
  }

  async deleteDocument(documentId: string, establishmentId: string) {
    const document = await this.prisma.pmsDocument.findFirstOrThrow({
      where: { id: documentId, establishmentId },
    });

    // Delete from GCS if URL exists
    if (document.fileUrl) {
      try {
        let gcsPath = document.fileUrl;
        if (gcsPath.startsWith('gs://')) {
          const parts = gcsPath.split('/');
          gcsPath = parts.slice(3).join('/');
        }
        await this.gcs.deleteFile(gcsPath);
      } catch (error) {
        console.error('Failed to delete PMS document from GCS:', error);
        // Continue anyway
      }
    }

    await this.prisma.pmsDocument.delete({ where: { id: document.id } });

    return { deleted: true };
  }

  async updateNotes(
    documentId: string,
    establishmentId: string,
    notes: string,
  ) {
    const document = await this.getDocumentById(documentId, establishmentId);

    return this.prisma.pmsDocument.update({
      where: { id: document.id },
      data: { notes },
    });
  }

  async getDownloadUrl(
    documentId: string,
    establishmentId: string,
  ): Promise<string> {
    const document = await this.getDocumentById(documentId, establishmentId);

    if (!document.fileUrl) {
      throw new BadRequestException(
        "Le document PMS n'a pas d'URL de fichier valide",
      );
    }

    // If using local file storage, return the full URL with backend origin
    if (document.fileUrl.startsWith('/uploads/')) {
      const apiUrl =
        this.config.get<string>('API_URL') || 'http://localhost:3000';
      return `${apiUrl}${document.fileUrl}`;
    }

    // Extract the path from gs://bucket/path format
    let gcsPath = document.fileUrl;
    if (gcsPath.startsWith('gs://')) {
      const parts = gcsPath.split('/');
      gcsPath = parts.slice(3).join('/'); // Skip gs://, bucket name, and empty string
    }

    // Generate signed URL valid for 1 hour
    return this.gcs.generateSignedUrl(gcsPath);
  }
}
