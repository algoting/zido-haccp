import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import type { PreparationBatch, InternalPreparation } from '@prisma/client';

type BatchWithPreparation = PreparationBatch & {
  internalPreparation?: InternalPreparation | null;
  createdBy: {
    displayName: string | null;
    email: string;
  };
};

@Injectable()
export class LabelService {
  async generateQRCode(batchId: string, frontendUrl: string): Promise<string> {
    const url = `${frontendUrl}/dlc/scan/${batchId}`;
    return QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      width: 200,
      margin: 1,
    });
  }

  async generateLabelPDF(
    batch: BatchWithPreparation,
    frontendUrl: string,
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const qrDataUrl = await this.generateQRCode(batch.batchId, frontendUrl);

        // 8cm x 3.4cm label to fit name + "ajouté par" line
        const doc = new PDFDocument({
          size: [227, 97],
          margins: { top: 5, bottom: 5, left: 5, right: 5 },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const productionDate = new Date(batch.productionDateTime).toLocaleString('fr-FR', {
          dateStyle: 'short',
          timeStyle: 'short',
        });
        const dlcDate = new Date(batch.dlc).toLocaleString('fr-FR', {
          dateStyle: 'short',
          timeStyle: 'short',
        });

        const batchName = batch.name || batch.internalPreparation?.name || '';

        // QR Code (left side)
        const qrSize = 75;
        const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrBuffer = Buffer.from(qrBase64, 'base64');
        doc.image(qrBuffer, 5, 5, { width: qrSize, height: qrSize });

        // Text column (right side)
        const textX = 5 + qrSize + 5;
        const textWidth = 227 - textX - 5;

        // Product name
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a1a')
          .text(batchName, textX, 8, { width: textWidth });

        // Production date
        doc.fontSize(10).font('Helvetica').fillColor('#333333')
          .text(`Prod: ${productionDate}`, textX, 32, { width: textWidth });

        // DLC date (red bold)
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#850d0d')
          .text(`DLC: ${dlcDate}`, textX, 50, { width: textWidth });

        // Quantity
        doc.fontSize(9).font('Helvetica').fillColor('#555555')
          .text(`Qté: ${batch.quantity} ${batch.unit}`, textX, 67, { width: textWidth });

        // Created by
        const createdByName = batch.createdBy.displayName || batch.createdBy.email;
        doc.fontSize(8).font('Helvetica').fillColor('#777777')
          .text(`Par: ${createdByName}`, textX, 80, { width: textWidth });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
