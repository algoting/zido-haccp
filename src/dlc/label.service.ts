import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import type { PreparationBatch, InternalPreparation } from '@prisma/client';

type BatchWithPreparation = PreparationBatch & {
  internalPreparation: InternalPreparation;
  createdBy: {
    displayName: string | null;
    email: string;
  };
};

@Injectable()
export class LabelService {
  /**
   * Generate QR code as data URL
   */
  async generateQRCode(batchId: string, frontendUrl: string): Promise<string> {
    // QR code will contain URL to view batch details
    const url = `${frontendUrl}/dlc/scan/${batchId}`;
    
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      width: 200,
      margin: 1,
    });
    
    return qrDataUrl;
  }

  /**
   * Generate printable label as PDF buffer
   */
  async generateLabelPDF(
    batch: BatchWithPreparation,
    frontendUrl: string,
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        // Generate QR code
        const qrDataUrl = await this.generateQRCode(batch.batchId, frontendUrl);
        
        // Create PDF document (8cm x 2cm label)
        // 8cm x 2cm = ~227px x 57px at 72 DPI
        const doc = new PDFDocument({
          size: [227, 57],
          margins: { top: 5, bottom: 5, left: 5, right: 5 },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Format dates
        const productionDate = new Date(batch.productionDateTime).toLocaleString('fr-FR', {
          dateStyle: 'short',
          timeStyle: 'short',
        });
        
        const dlcDate = new Date(batch.dlc).toLocaleString('fr-FR', {
          dateStyle: 'short',
          timeStyle: 'short',
        });

        // QR Code (left side)
        const qrSize = 47;
        const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrBuffer = Buffer.from(qrBase64, 'base64');
        
        doc.image(qrBuffer, 5, 5, {
          width: qrSize,
          height: qrSize,
        });

        // Text column (right side)
        const textX = 5 + qrSize + 5;
        const textWidth = 227 - textX - 5;
        const fontSize = 14;
        const estimatedLineHeight = fontSize * 1.2;
        const lineGap = 6;
        const textBlockHeight = estimatedLineHeight * 2 + lineGap;
        const startY = (57 - textBlockHeight) / 2;
        
        // Production date (top)
        doc
          .fontSize(fontSize)
          .font('Helvetica')
          .text(`Prod: ${productionDate}`, textX, startY, {
            width: textWidth,
          });
        
        // DLC date (bottom) - red and bold
        doc
          .fontSize(fontSize)
          .font('Helvetica-Bold')
          .fillColor('#850d0d')
          .text(`DLC: ${dlcDate}`, textX, startY + estimatedLineHeight + lineGap, {
            width: textWidth,
          });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
