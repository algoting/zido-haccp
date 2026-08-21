import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from './pdf.service';
import { GcsService } from './gcs.service';
import { LocalFileService } from './local-file.service';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);
  private gcsEnabled = false;

  constructor(
    private prisma: PrismaService,
    private pdf: PdfService,
    private gcs: GcsService,
    private localFile: LocalFileService,
  ) {
    // Check if GCS is available (if injection worked without errors)
    this.gcsEnabled = !!this.gcs && !!(this.gcs as any).storage;
  }

  async createExportJob(
    establishmentId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return this.prisma.exportJob.create({
      data: {
        establishmentId,
        periodStart,
        periodEnd,
        status: 'PENDING',
      },
    });
  }

  async getExportJobs(establishmentId: string, skip = 0, take = 50) {
    return this.prisma.exportJob.findMany({
      where: { establishmentId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async getExportJob(id: string, establishmentId: string) {
    const job = await this.prisma.exportJob.findFirst({
      where: { id, establishmentId },
    });

    if (!job) {
      throw new NotFoundException("Tâche d'export non trouvée");
    }

    return job;
  }

  async updateExportJobStatus(
    id: string,
    establishmentId: string,
    status: 'PENDING' | 'READY' | 'FAILED',
    fileUrl?: string,
    errorMessage?: string,
  ) {
    return this.prisma.exportJob.update({
      where: { id, establishmentId },
      data: {
        status,
        fileUrl: fileUrl || undefined,
        errorMessage: errorMessage || undefined,
        completedAt: ['READY', 'FAILED'].includes(status)
          ? new Date()
          : undefined,
      },
    });
  }

  /**
   * Process export job: generate PDF and upload to storage (GCS or local)
   * This would typically be called by a Cloud Task or scheduled job
   */
  async processExportJob(jobId: string, establishmentId: string, req?: any) {
    try {
      // Get job details and establishment info
      const job = await this.prisma.exportJob.findFirst({
        where: { id: jobId, establishmentId },
      });
      if (!job) {
        throw new NotFoundException("Tâche d'export non trouvée");
      }

      const establishment = await this.prisma.establishment.findUnique({
        where: { id: establishmentId },
      });

      this.logger.log(
        `Processing export job ${jobId} for establishment ${establishmentId}`,
      );

      // Generate PDF
      const pdfBuffer = await this.pdf.generateHACCPReport(
        establishmentId,
        job.periodStart,
        job.periodEnd,
        {
          userId: req?.user?.id,
          exportJobId: job.id,
          userEmail: req?.user?.email,
        },
      );

      // Generate descriptive filename with a unique export job suffix
      // This ensures re-generating the same month always produces a new download URL
      const monthYear = job.periodStart.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      const sanitizedName = (establishment?.name || 'export')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      const filename = `${sanitizedName}_${monthYear.replace(' ', '_').toLowerCase()}_${job.id}.pdf`;

      // Upload to GCS or local storage
      let fileUrl: string;
      if (this.gcsEnabled) {
        fileUrl = await this.gcs.uploadExportPdf(
          establishmentId,
          jobId,
          pdfBuffer,
          filename,
        );
      } else {
        this.logger.log('GCS not available, using local file storage');
        fileUrl = this.localFile.uploadExportPdf(
          establishmentId,
          jobId,
          pdfBuffer,
          filename,
        );
      }

      // Update job status to READY with file URL
      await this.updateExportJobStatus(jobId, establishmentId, 'READY', fileUrl);

      this.logger.log(`Export job ${jobId} completed successfully`);
      return { success: true, fileUrl };
    } catch (error) {
      // Update job status to FAILED with error message
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error during PDF generation';
      this.logger.error(`Export job ${jobId} failed: ${errorMessage}`);
      await this.updateExportJobStatus(
        jobId,
        establishmentId,
        'FAILED',
        undefined,
        errorMessage,
      );

      throw error;
    }
  }

  /**
   * Get download URL for a completed export
   */
  async getExportDownloadUrl(jobId: string, establishmentId: string) {
    const job = await this.getExportJob(jobId, establishmentId);

    if (job.status !== 'READY') {
      throw new NotFoundException(
        "L'export n'est pas prêt pour le téléchargement",
      );
    }

    // If using local file storage, return the full URL with backend origin
    if (!this.gcsEnabled) {
      const apiUrl = process.env.FRONTEND_URL || process.env.API_URL || 'http://localhost:3000';
      const fullUrl = `${apiUrl}${job.fileUrl}`;
      return fullUrl;
    }

    if (!job.fileUrl) {
      throw new NotFoundException('Aucun fichier d’export disponible pour ce job');
    }

    const gcsPath = job.fileUrl.replace(/^gs:\/\/[^/]+\//, '');
    return this.gcs.getExportDownloadUrl(gcsPath);
  }

  /**
   * Get data for export
   */
  async getExportData(
    establishmentId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const [
      equipment,
      temperatureLogs,
      incidents,
      cleaningPlans,
      oilChecks,
      pmsDocuments,
    ] = await Promise.all([
      this.prisma.equipment.findMany({
        where: { establishmentId },
        select: { id: true, name: true, minTempC: true, maxTempC: true },
      }),
      this.prisma.temperatureLog.findMany({
        where: {
          establishmentId,
          measuredAt: { gte: periodStart, lte: periodEnd },
        },
        orderBy: { measuredAt: 'desc' },
      }),
      this.prisma.incident.findMany({
        where: {
          establishmentId,
          openedAt: { gte: periodStart, lte: periodEnd },
        },
        include: { correctiveActions: true },
      }),
      this.prisma.cleaningPlan.findMany({
        where: {
          establishmentId,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        include: {
          taskChecks: {
            include: { task: true, checkedBy: { select: { email: true } } },
          },
        },
      }),
      this.prisma.oilCheck.findMany({
        where: {
          station: { establishmentId },
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        include: { station: { select: { name: true } } },
      }),
      this.prisma.pmsDocument.findMany({
        where: { establishmentId },
        orderBy: { uploadedAt: 'desc' },
        take: 1,
      }),
    ]);

    return {
      equipment,
      temperatureLogs,
      incidents,
      cleaningPlans,
      oilChecks,
      pmsDocument: pmsDocuments?.[0] || null,
    };
  }
}
