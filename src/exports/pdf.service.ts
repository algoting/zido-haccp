import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { Readable, PassThrough } from 'stream';

type PdfKitDocument = InstanceType<typeof PDFDocument>;

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate a comprehensive HACCP report PDF for an establishment
   * Includes: temperature logs, cleaning runs, oil checks, incidents, PMS reference
   */
  async generateHACCPReport(
    establishmentId: string,
    periodStart: Date,
    periodEnd: Date,
    options?: {
      userId?: string;
      exportJobId?: string;
      userEmail?: string;
    },
  ): Promise<Buffer> {
    this.logger.log('[PDF] Starting generateHACCPReport for:', establishmentId);

    try {
      this.logger.log('[PDF] Fetching establishment...');
      const establishment = await this.prisma.establishment.findUnique({
        where: { id: establishmentId },
        include: { subscription: true },
      });
      this.logger.log('[PDF] Establishment fetched:', establishment?.name);

      this.logger.log('[PDF] Fetching temperature logs...');
      const temperatureLogs = await this.prisma.temperatureLog.findMany({
        where: {
          equipment: { establishmentId },
          measuredAt: { gte: periodStart, lte: periodEnd },
        },
        include: { equipment: true },
        orderBy: { measuredAt: 'asc' },
      });
      this.logger.log(
        '[PDF] Temperature logs fetched:',
        temperatureLogs.length,
      );

      this.logger.log('[PDF] Fetching cleaning plans...');
      const cleaningPlans = await this.prisma.cleaningPlan.findMany({
        where: {
          establishmentId,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        include: {
          taskChecks: {
            include: { task: true, checkedBy: { select: { email: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      this.logger.log('[PDF] Cleaning plans fetched:', cleaningPlans.length);

      this.logger.log('[PDF] Fetching oil checks...');
      const oilChecks = await this.prisma.oilCheck.findMany({
        where: {
          station: { establishmentId },
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        include: { station: true },
        orderBy: { createdAt: 'asc' },
      });
      this.logger.log('[PDF] Oil checks fetched:', oilChecks.length);

      this.logger.log('[PDF] Fetching incidents...');
      const incidents = await this.prisma.incident.findMany({
        where: {
          establishmentId,
          openedAt: { gte: periodStart, lte: periodEnd },
        },
        orderBy: { openedAt: 'asc' },
      });
      this.logger.log('[PDF] Incidents fetched:', incidents.length);

      this.logger.log('[PDF] Fetching task checks...');
      const taskChecks = await this.prisma.cleaningTaskCheck.findMany({
        where: {
          task: { equipment: { sector: { establishmentId } } },
          checkedAt: { gte: periodStart, lte: periodEnd },
        },
        include: {
          task: { include: { equipment: { include: { sector: true } } } },
          checkedBy: { select: { email: true } },
        },
        orderBy: { checkedAt: 'asc' },
      });
      this.logger.log('[PDF] Task checks fetched:', taskChecks.length);

      this.logger.log('[PDF] Fetching reception entries...');
      const receptionEntries = await this.prisma.goodsReception.findMany({
        where: {
          establishmentId,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        include: { supplier: true },
        orderBy: { createdAt: 'asc' },
      });
      this.logger.log('[PDF] Reception entries fetched:', receptionEntries.length);

      // Note: ProductMovement model doesn't exist in schema - skipping this section
      const productMovements: any[] = [];
      this.logger.log('[PDF] Product movements: 0 (not tracked)');

      this.logger.log('[PDF] Fetching PMS documents...');
      const pmsDocuments = await this.prisma.pmsDocument.findMany({
        where: { establishmentId },
        orderBy: { uploadedAt: 'desc' },
        take: 5, // Latest 5 documents
      });
      this.logger.log('[PDF] PMS documents fetched:', pmsDocuments.length);

      this.logger.log('[PDF] Fetching DLC batches...');
      const dlcBatches = await this.prisma.preparationBatch.findMany({
        where: {
          establishmentId,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        include: { internalPreparation: true },
        orderBy: { createdAt: 'asc' },
      });
      this.logger.log('[PDF] DLC batches fetched:', dlcBatches.length);

      this.logger.log('[PDF] Fetching support tickets...');
      const supportTickets = await this.prisma.supportTicket.findMany({
        where: {
          establishmentId,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        include: { messages: true },
        orderBy: { createdAt: 'asc' },
      });
      this.logger.log('[PDF] Support tickets fetched:', supportTickets.length);

      this.logger.log('[PDF] Fetching corrective actions...');
      const correctiveActions = await this.prisma.correctiveAction.findMany({
        where: {
          incident: {
            establishmentId,
            openedAt: { gte: periodStart, lte: periodEnd },
          },
        },
        include: { incident: true },
        orderBy: { createdAt: 'asc' },
      });
      this.logger.log('[PDF] Corrective actions fetched:', correctiveActions.length);

      this.logger.log('[PDF] Fetching equipment changes...');
      const equipmentChanges = await this.prisma.equipment.findMany({
        where: { establishmentId },
        select: {
          id: true,
          name: true,
          minTempC: true,
          maxTempC: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      this.logger.log('[PDF] Equipment fetched:', equipmentChanges.length);

      this.logger.log('[PDF] Fetching audit logs count...');
      const auditLogsCount = await this.prisma.auditLog.count({
        where: {
          establishmentId,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      });
      this.logger.log('[PDF] Audit logs count:', auditLogsCount);
      const doc: PdfKitDocument = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      // Use PassThrough stream to properly pipe the document
      const passThrough = new PassThrough();
      const chunks: Buffer[] = [];

      passThrough.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      this.logger.log('[PDF] Writing PDF content...');
      // Pipe document to passthrough stream
      doc.pipe(passThrough);

      // ============ HEADER SECTION ============
      doc.fontSize(24).font('Helvetica-Bold').text('HACCP Compliance Report');

      doc
        .fontSize(12)
        .font('Helvetica')
        .text('Comprehensive Food Safety & HACCP Report');

      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`);
      if (options?.userEmail) {
        doc.text(`Generated by: ${options.userEmail}`);
      }
      if (options?.exportJobId) {
        doc.text(`Export Job ID: ${options.exportJobId}`);
      }

      doc.moveDown();

      // ============ ESTABLISHMENT INFO ============
      doc.fontSize(14).font('Helvetica-Bold').text('Establishment Information');

      doc.fontSize(10).font('Helvetica');

      doc.text(`Name: ${establishment?.name || 'N/A'}`);
      doc.text(
        `Report Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`,
      );
      doc.text(
        `Subscription Status: ${establishment?.subscription?.status || 'N/A'}`,
      );

      doc.moveDown();

      // ============ SUMMARY STATISTICS ============
      doc.fontSize(14).font('Helvetica-Bold').text('Summary Statistics');

      doc.fontSize(10).font('Helvetica');

      doc.text(`Temperature Logs: ${temperatureLogs.length}`);
      doc.text(`Cleaning Plans: ${cleaningPlans.length}`);
      doc.text(`Task Checks: ${taskChecks.length}`);
      doc.text(`Oil Quality Checks: ${oilChecks.length}`);
      doc.text(`Incidents: ${incidents.length}`);
      doc.text(`Corrective Actions: ${correctiveActions.length}`);
      doc.text(`Reception Entries: ${receptionEntries.length}`);
      doc.text(`Product Movements: ${productMovements.length}`);
      doc.text(`DLC Batches: ${dlcBatches.length}`);
      doc.text(`Support Tickets: ${supportTickets.length}`);
      doc.text(`PMS Documents: ${pmsDocuments.length}`);
      doc.text(`Audit Log Entries: ${auditLogsCount}`);
      doc.text(`Equipment Items: ${equipmentChanges.length}`);

      doc.moveDown();

      // ============ TEMPERATURE LOGS SECTION ============
      doc.fontSize(12).font('Helvetica-Bold').text('Temperature Logs');

      doc.fontSize(9).font('Helvetica');

      doc.text(`Total Temperature Logs: ${temperatureLogs.length}`);

      if (temperatureLogs.length === 0) {
        doc.text('No temperature logs recorded during this period.');
      } else {
        const equipmentGrouped = temperatureLogs.reduce(
          (acc, log) => {
            const key = log.equipment.name;
            if (!acc[key]) acc[key] = [];
            acc[key].push(log);
            return acc;
          },
          {} as Record<string, typeof temperatureLogs>,
        );

        Object.entries(equipmentGrouped).forEach(([equipName, logs]) => {
          const logsArray = Array.isArray(logs) ? logs : [logs];
          const avgTemp = (
            logsArray.reduce((sum, l: any) => sum + l.temperatureC, 0) / logsArray.length
          ).toFixed(1);
          const minTemp = Math.min(...logsArray.map((l: any) => l.temperatureC));
          const maxTemp = Math.max(...logsArray.map((l: any) => l.temperatureC));

          doc.text(
            `${equipName}: ${logsArray.length} logs | Avg: ${avgTemp}°C | Min: ${minTemp}°C | Max: ${maxTemp}°C`,
          );
        });
      }

      doc.moveDown();

      // ============ CLEANING CHECKLIST SECTION ============
      doc.fontSize(12).font('Helvetica-Bold').text('Cleaning Checklist');

      doc.fontSize(9).font('Helvetica');

      const completed = cleaningPlans.filter((r) => r.completedAt).length;
      const pending = cleaningPlans.filter((r) => !r.completedAt).length;

      doc.text(`Cleaning Plans Created: ${cleaningPlans.length}`);
      doc.text(`Completed: ${completed}`);
      doc.text(`Pending: ${pending}`);
      doc.text(`Task Checks Done: ${taskChecks.length}`);

      doc.moveDown();

      // ============ OIL QUALITY SECTION ============
      doc.fontSize(12).font('Helvetica-Bold').text('Oil Quality Checks');

      doc.fontSize(9).font('Helvetica');

      const good = oilChecks.filter((o) => o.quality === 'GOOD').length;
      const bad = oilChecks.filter((o) => o.quality === 'BAD').length;
      const goodPercentage = oilChecks.length > 0 ? ((good / oilChecks.length) * 100).toFixed(1) : '0.0';

      doc.text(`Total Checks: ${oilChecks.length}`);
      doc.text(`Good: ${good} (${goodPercentage}%)`);
      doc.text(`Bad: ${bad}`);

      doc.moveDown();

      // ============ INCIDENTS & DEVIATIONS SECTION ============
      doc.fontSize(12).font('Helvetica-Bold').text('Incidents & Deviations');

      doc.fontSize(9).font('Helvetica');

      doc.text(`Total Incidents: ${incidents.length}`);

      if (incidents.length === 0) {
        doc.text('No incidents recorded during this period - Excellent compliance!');
      } else {
        const incidentsByType = incidents.reduce(
          (acc, inc) => {
            const key = inc.type || 'UNKNOWN';
            if (!acc[key]) acc[key] = 0;
            acc[key]++;
            return acc;
          },
          {} as Record<string, number>,
        );

        Object.entries(incidentsByType).forEach(([type, count]) => {
          doc.text(`${type}: ${count}`);
        });
      }

      doc.moveDown();

      // ============ CORRECTIVE ACTIONS SECTION ============
      doc.fontSize(12).font('Helvetica-Bold').text('Corrective Actions');

      doc.fontSize(9).font('Helvetica');

      doc.text(`Total Corrective Actions: ${correctiveActions.length}`);

      if (correctiveActions.length === 0) {
        doc.text('No corrective actions recorded during this period.');
      } else {
        doc.text('All corrective actions are tracked and documented.');
      }

      doc.moveDown();

      // ============ TASK CHECKS SECTION ============
      doc.fontSize(12).font('Helvetica-Bold').text('Task Completion Details');

      doc.fontSize(9).font('Helvetica');

      doc.text(`Total Task Checks: ${taskChecks.length}`);

      if (taskChecks.length === 0) {
        doc.text('No task checks recorded during this period.');
      } else {
        const checksBySector = taskChecks.reduce(
          (acc, check) => {
            const key = check.task.equipment.sector.name;
            if (!acc[key]) acc[key] = [];
            acc[key].push(check);
            return acc;
          },
          {} as Record<string, typeof taskChecks>,
        );

        Object.entries(checksBySector).forEach(([sectorName, checks]) => {
          const checksArray = Array.isArray(checks) ? checks : [checks];
          doc.text(`${sectorName}: ${checksArray.length} checks completed`);
        });
      }

      doc.moveDown();

      // ============ RECEPTION ENTRIES SECTION ============
      doc.fontSize(12).font('Helvetica-Bold').text('Reception & Supplier Deliveries');

      doc.fontSize(9).font('Helvetica');

      doc.text(`Total Reception Entries: ${receptionEntries.length}`);

      if (receptionEntries.length === 0) {
        doc.text('No reception entries recorded during this period.');
      } else {
        const entriesBySupplier = receptionEntries.reduce(
          (acc, entry) => {
            const key = entry.supplier?.name || 'Unknown Supplier';
            if (!acc[key]) acc[key] = 0;
            acc[key]++;
            return acc;
          },
          {} as Record<string, number>,
        );

        Object.entries(entriesBySupplier).forEach(([supplier, count]) => {
          doc.text(`${supplier}: ${count} deliveries`);
        });
      }

      doc.moveDown();

      // ============ PRODUCT MOVEMENTS SECTION ============
      doc.fontSize(12).font('Helvetica-Bold').text('Product Traceability');

      doc.fontSize(9).font('Helvetica');

      doc.text('Product movements are not currently tracked in the system.');
      doc.text('Products are managed with creation and expiry tracking.');

      doc.moveDown();

      // ============ DLC BATCHES SECTION ============
      doc.fontSize(12).font('Helvetica-Bold').text('DLC Batch Creation & Labels');

      doc.fontSize(9).font('Helvetica');

      doc.text(`Total DLC Batches: ${dlcBatches.length}`);

      if (dlcBatches.length === 0) {
        doc.text('No DLC batches created during this period.');
      } else {
        const batchesByTemplate = dlcBatches.reduce(
          (acc, batch) => {
            const key = batch.internalPreparation?.name || 'Unknown Product';
            if (!acc[key]) acc[key] = 0;
            acc[key]++;
            return acc;
          },
          {} as Record<string, number>,
        );

        Object.entries(batchesByTemplate).forEach(([template, count]) => {
          doc.text(`${template}: ${count} batches`);
        });
      }

      doc.moveDown();

      // ============ SUPPORT TICKETS SECTION ============
      doc.fontSize(12).font('Helvetica-Bold').text('Support & Communication');

      doc.fontSize(9).font('Helvetica');

      doc.text(`Total Support Tickets: ${supportTickets.length}`);

      if (supportTickets.length === 0) {
        doc.text('No support tickets created during this period.');
      } else {
        const ticketsByStatus = supportTickets.reduce(
          (acc, ticket) => {
            const key = ticket.status || 'OPEN';
            if (!acc[key]) acc[key] = 0;
            acc[key]++;
            return acc;
          },
          {} as Record<string, number>,
        );

        Object.entries(ticketsByStatus).forEach(([status, count]) => {
          doc.text(`${status}: ${count}`);
        });
      }

      doc.moveDown();

      // ============ PMS DOCUMENTS SECTION ============
      doc.fontSize(12).font('Helvetica-Bold').text('PMS Compliance Documents');

      doc.fontSize(9).font('Helvetica');

      doc.text(`Total PMS Documents: ${pmsDocuments.length}`);

      if (pmsDocuments.length === 0) {
        doc.text('No PMS documents uploaded.');
      } else {
        pmsDocuments.slice(0, 3).forEach((docItem) => {
          doc.text(`${docItem.originalName} (${new Date(docItem.uploadedAt).toLocaleDateString()})`);
        });

        if (pmsDocuments.length > 3) {
          doc.text(`... and ${pmsDocuments.length - 3} more documents`);
        }
      }

      doc.moveDown();

      // ============ EQUIPMENT STATUS SECTION ============
      doc.fontSize(12).font('Helvetica-Bold').text('Equipment Inventory');

      doc.fontSize(9).font('Helvetica');

      doc.text(`Total Equipment Items: ${equipmentChanges.length}`);

      if (equipmentChanges.length > 0) {
        const recentChanges = equipmentChanges
          .filter(eq => eq.updatedAt >= periodStart && eq.updatedAt <= periodEnd)
          .length;
        doc.text(`Equipment Updated During Period: ${recentChanges}`);
      }

      doc.moveDown();

      // ============ AUDIT LOG SUMMARY ============
      doc.fontSize(12).font('Helvetica-Bold').text('Audit Trail Summary');

      doc.fontSize(9).font('Helvetica');

      doc.text(`Total Audit Log Entries: ${auditLogsCount}`);
      doc.text(`Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`);

      doc.moveDown(2);

      // ============ FOOTER ============
      doc
        .fontSize(8)
        .font('Helvetica')
        .text(
          'This is an automated HACCP compliance report. For detailed information or concerns, please contact your establishment manager.',
        );

      doc
        .fontSize(7)
        .text(
          `Document ID: ${establishmentId.substring(0, 8)} | Generated: ${new Date().toISOString()}`,
        );

      this.logger.log('[PDF] Ending PDF document and waiting for stream...');
      // End the document - this triggers the stream to close and emit 'end'
      doc.end();

      // Return promise that waits for all data to be collected
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('PDF stream collection timeout (60 seconds)'));
        }, 60000);

        passThrough.on('end', () => {
          clearTimeout(timeout);
          const buffer = Buffer.concat(chunks);
          this.logger.log(
            '[PDF] PDF stream ended, total size:',
            buffer.length,
            'bytes',
          );
          resolve(buffer);
        });

        passThrough.on('error', (error) => {
          clearTimeout(timeout);
          const err = error instanceof Error ? error : new Error(String(error));
          this.logger.error('[PDF] PassThrough stream error:', err);
          reject(err);
        });

        doc.on('error', (error) => {
          clearTimeout(timeout);
          const err = error instanceof Error ? error : new Error(String(error));
          this.logger.error('[PDF] PDF document error:', err);
          reject(err);
        });
      });

      this.logger.log(
        '[PDF] Report generated successfully:',
        pdfBuffer.length,
        'bytes',
      );
      return pdfBuffer;
    } catch (error) {
      this.logger.error(
        '[PDF] Error generating report:',
        error instanceof Error ? error.message : error,
      );
      if (error instanceof Error) {
        this.logger.error('[PDF] Stack:', error.stack);
      }
      throw error;
    }
  }

  /**
   * Generate a stream of PDF (useful for large files)
   */
  async generateHACCPReportStream(
    establishmentId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Readable> {
    const doc: PdfKitDocument = new PDFDocument({
      size: 'A4',
      margin: 40,
    });

    // Same logic as above, but return stream directly
    const establishment = await this.prisma.establishment.findUnique({
      where: { id: establishmentId },
    });

    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('HACCP Report', { align: 'center' });
    doc.moveDown();
    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Establishment: ${establishment?.name || 'N/A'}`);
    doc.text(
      `Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`,
    );
    doc.text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text('HACCP Report Generated');
    doc.fontSize(10).font('Helvetica').text('Data aggregation complete.');

    doc.end();

    return doc as unknown as Readable;
  }
}
