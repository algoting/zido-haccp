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
          task: { equipment: { subSector: { sector: { establishmentId } } } },
          checkedAt: { gte: periodStart, lte: periodEnd },
        },
        include: {
          task: { include: { equipment: { include: { subSector: { include: { sector: true } } } } } },
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

      // ── Design constants ────────────────────────────────────────────────
      const PAGE_W = doc.page.width;   // 595.28 for A4
      const PAGE_H = doc.page.height;  // 841.89 for A4
      const M = 50;
      const CW = PAGE_W - 2 * M;      // 495.28

      const C = {
        blueDark:    '#1E40AF',
        blue:        '#2563EB',
        blueLight:   '#DBEAFE',
        blueXLight:  '#EFF6FF',
        slate900:    '#0F172A',
        slate800:    '#1E293B',
        slate700:    '#374151',
        slate600:    '#4B5563',
        slate500:    '#6B7280',
        slate400:    '#94A3B8',
        slate300:    '#D1D5DB',
        slate200:    '#E5E7EB',
        slate100:    '#F3F4F6',
        slate50:     '#F9FAFB',
        green:       '#16A34A',
        greenLight:  '#DCFCE7',
        red:         '#DC2626',
        redLight:    '#FEE2E2',
        orange:      '#D97706',
        orangeLight: '#FEF3C7',
        purple:      '#7C3AED',
        purpleLight: '#EDE9FE',
        teal:        '#0D9488',
        tealLight:   '#CCFBF1',
        white:       '#FFFFFF',
      };

      // ── Layout helpers ───────────────────────────────────────────────────

      // Adds a new page if curY + need overflows; returns updated Y
      const ensureSpace = (need: number, curY: number): number => {
        if (curY + need > PAGE_H - M) { doc.addPage(); return M; }
        return curY;
      };

      // Draws a section header bar with a blue left accent; returns next Y
      const sectionHeader = (title: string, curY: number): number => {
        const H = 26;
        curY = ensureSpace(H + 40, curY);
        doc.rect(M, curY, CW, H).fill(C.slate100);
        doc.rect(M, curY, 4, H).fill(C.blue);
        doc.fillColor(C.slate800).fontSize(9).font('Helvetica-Bold')
          .text(title.toUpperCase(), M + 14, curY + 9, { width: CW - 20, lineBreak: false });
        return curY + H + 6;
      };

      // Full-width text row with optional zebra shading
      const textRow = (text: string, curY: number, shade: boolean): number => {
        const H = 17;
        curY = ensureSpace(H, curY);
        if (shade) doc.rect(M, curY, CW, H).fill(C.slate50);
        doc.fillColor(C.slate700).fontSize(8).font('Helvetica')
          .text(text, M + 10, curY + 4, { width: CW - 20, lineBreak: false });
        return curY + H;
      };

      // Two-column key / value row
      const kvRow = (label: string, value: string, curY: number, shade: boolean): number => {
        const H = 17;
        curY = ensureSpace(H, curY);
        if (shade) doc.rect(M, curY, CW, H).fill(C.slate50);
        doc.fillColor(C.slate500).fontSize(8).font('Helvetica')
          .text(label, M + 10, curY + 4, { width: CW / 2 - 10, lineBreak: false });
        doc.fillColor(C.slate900).fontSize(8).font('Helvetica-Bold')
          .text(value, M + CW / 2, curY + 4, { width: CW / 2 - 10, lineBreak: false });
        return curY + H;
      };

      // Thin horizontal rule with spacing
      const hr = (curY: number): number => {
        doc.moveTo(M, curY).lineTo(M + CW, curY)
          .strokeColor(C.slate200).lineWidth(0.5).stroke();
        return curY + 14;
      };

      // ── HEADER BANNER ────────────────────────────────────────────────────
      const HEADER_H = 110;
      // Dark blue background
      doc.rect(0, 0, PAGE_W, HEADER_H).fill(C.blueDark);
      // Bright blue accent stripe at the bottom of the header
      doc.rect(0, HEADER_H - 4, PAGE_W, 4).fill(C.blue);

      // HACCP APP brand label (top-left)
      doc.fillColor(C.blueLight).fontSize(8).font('Helvetica-Bold')
        .text('HACCP APP', M, 15, { lineBreak: false });

      // Main title (centred)
      doc.fillColor(C.white).fontSize(20).font('Helvetica-Bold')
        .text('Rapport de conformité HACCP', M, 28, { width: CW, align: 'center', lineBreak: false });

      // Subtitle
      doc.fillColor(C.blueLight).fontSize(9).font('Helvetica')
        .text('Rapport complet de sécurité alimentaire & HACCP', M, 56, { width: CW, align: 'center', lineBreak: false });

      // Meta line (generated date, author, job ID)
      const metaParts: string[] = [`Généré le : ${new Date().toLocaleString('fr-FR')}`];
      if (options?.userEmail) metaParts.push(`Par : ${options.userEmail}`);
      if (options?.exportJobId) metaParts.push(`ID : ${options.exportJobId}`);
      doc.fillColor(C.slate400).fontSize(7).font('Helvetica')
        .text(metaParts.join('   •   '), M, 80, { width: CW, align: 'center', lineBreak: false });

      // ── ESTABLISHMENT INFO BOX ───────────────────────────────────────────
      let y = HEADER_H + 14;
      const INFO_H = 62;
      doc.roundedRect(M, y, CW, INFO_H, 6).fill(C.blueXLight);
      doc.roundedRect(M, y, CW, INFO_H, 6).strokeColor(C.blueLight).lineWidth(0.75).stroke();

      // Left column – establishment name
      doc.fillColor(C.slate500).fontSize(7).font('Helvetica')
        .text('ÉTABLISSEMENT', M + 14, y + 10, { lineBreak: false });
      doc.fillColor(C.slate900).fontSize(14).font('Helvetica-Bold')
        .text(establishment?.name || 'N/A', M + 14, y + 21, { width: CW / 2 - 20, lineBreak: false });

      // Right column – period
      const rx = M + CW / 2 + 10;
      doc.fillColor(C.slate500).fontSize(7).font('Helvetica')
        .text('PÉRIODE DU RAPPORT', rx, y + 10, { lineBreak: false });
      doc.fillColor(C.slate900).fontSize(11).font('Helvetica-Bold')
        .text(
          `${periodStart.toLocaleDateString('fr-FR')} — ${periodEnd.toLocaleDateString('fr-FR')}`,
          rx, y + 21, { width: CW / 2 - 10, lineBreak: false },
        );

      // Bottom meta – subscription status
      doc.fillColor(C.slate500).fontSize(7.5).font('Helvetica')
        .text(`Abonnement : ${establishment?.subscription?.status || 'N/A'}`, M + 14, y + 47, { lineBreak: false });

      y += INFO_H + 16;

      // ── SUMMARY STAT CARDS ───────────────────────────────────────────────
      const CARD_H = 64;
      const GAP = 7;
      const CARD_W = (CW - GAP * 5) / 6;

      const cards = [
        { v: temperatureLogs.length, l: 'Températures', c: C.blue,   bg: C.blueXLight  },
        { v: cleaningPlans.length,   l: 'Nettoyage',    c: C.green,  bg: C.greenLight  },
        { v: incidents.length,       l: 'Incidents',    c: incidents.length === 0 ? C.green  : C.red,    bg: incidents.length === 0 ? C.greenLight : C.redLight },
        { v: oilChecks.length,       l: 'Huile',        c: C.orange, bg: C.orangeLight },
        { v: dlcBatches.length,      l: 'Lots DLC',     c: C.purple, bg: C.purpleLight },
        { v: taskChecks.length,      l: 'Tâches',       c: C.teal,   bg: C.tealLight   },
      ];

      cards.forEach((card, i) => {
        const cx = M + i * (CARD_W + GAP);
        doc.roundedRect(cx, y, CARD_W, CARD_H, 5).fill(card.bg);
        doc.fillColor(card.c).fontSize(22).font('Helvetica-Bold')
          .text(String(card.v), cx, y + 10, { width: CARD_W, align: 'center', lineBreak: false });
        doc.fillColor(card.c).fontSize(7).font('Helvetica')
          .text(card.l, cx, y + 39, { width: CARD_W, align: 'center', lineBreak: false });
      });

      y += CARD_H + 20;

      // ── SECTION: Relevés de température ──────────────────────────────────
      y = sectionHeader('Relevés de température', y);
      y = kvRow('Total des relevés', String(temperatureLogs.length), y, false);

      if (temperatureLogs.length === 0) {
        y = textRow('Aucun relevé de température enregistré sur cette période.', y, true);
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
        let shade = true;
        Object.entries(equipmentGrouped).forEach(([equipName, logs]) => {
          const logsArray = Array.isArray(logs) ? logs : [logs];
          const avgTemp = (logsArray.reduce((s, l: any) => s + l.temperatureC, 0) / logsArray.length).toFixed(1);
          const minTemp = Math.min(...logsArray.map((l: any) => l.temperatureC));
          const maxTemp = Math.max(...logsArray.map((l: any) => l.temperatureC));
          y = textRow(`${equipName} : ${logsArray.length} relevés   Moy. ${avgTemp}°C   Min ${minTemp}°C   Max ${maxTemp}°C`, y, shade);
          shade = !shade;
        });
      }

      y = hr(y + 4);

      // ── SECTION: Plan de nettoyage ────────────────────────────────────────
      y = sectionHeader('Plan de nettoyage', y);
      const completed = cleaningPlans.filter((r) => r.completedAt).length;
      const pending   = cleaningPlans.filter((r) => !r.completedAt).length;
      y = kvRow('Plans créés', String(cleaningPlans.length), y, false);
      y = kvRow('Terminés', String(completed), y, true);
      y = kvRow('En attente', String(pending), y, false);
      y = kvRow('Vérifications de tâches effectuées', String(taskChecks.length), y, true);

      y = hr(y + 4);

      // ── SECTION: Contrôles d'huile de friture ────────────────────────────
      y = sectionHeader("Contrôles d'huile de friture", y);
      const good = oilChecks.filter((o) => o.quality === 'GOOD').length;
      const bad  = oilChecks.filter((o) => o.quality === 'BAD').length;
      const goodPercentage = oilChecks.length > 0 ? ((good / oilChecks.length) * 100).toFixed(1) : '0.0';
      y = kvRow('Total des contrôles', String(oilChecks.length), y, false);
      y = kvRow('Bonne qualité', `${good} (${goodPercentage}%)`, y, true);
      y = kvRow('Mauvaise qualité', String(bad), y, false);

      y = hr(y + 4);

      // ── SECTION: Incidents & Déviations ──────────────────────────────────
      y = sectionHeader('Incidents & Déviations', y);
      y = kvRow('Total des incidents', String(incidents.length), y, false);
      if (incidents.length === 0) {
        y = textRow('Aucun incident enregistré sur cette période — Excellente conformité !', y, true);
      } else {
        const incidentsByType = incidents.reduce(
          (acc, inc) => { const k = inc.type || 'INCONNU'; acc[k] = (acc[k] || 0) + 1; return acc; },
          {} as Record<string, number>,
        );
        let shade = true;
        Object.entries(incidentsByType).forEach(([type, count]) => {
          y = kvRow(type, String(count), y, shade); shade = !shade;
        });
      }

      y = hr(y + 4);

      // ── SECTION: Actions correctives ──────────────────────────────────────
      y = sectionHeader('Actions correctives', y);
      y = kvRow('Total des actions correctives', String(correctiveActions.length), y, false);
      y = textRow(
        correctiveActions.length === 0
          ? 'Aucune action corrective enregistrée sur cette période.'
          : 'Toutes les actions correctives sont tracées et documentées.',
        y, true,
      );

      y = hr(y + 4);

      // ── SECTION: Vérifications de tâches ──────────────────────────────────
      y = sectionHeader('Détail des vérifications de tâches', y);
      y = kvRow('Total des vérifications', String(taskChecks.length), y, false);
      if (taskChecks.length === 0) {
        y = textRow('Aucune vérification de tâche enregistrée sur cette période.', y, true);
      } else {
        const checksBySector = taskChecks.reduce(
          (acc, check) => {
            const key = check.task.equipment.subSector.sector.name;
            if (!acc[key]) acc[key] = [];
            acc[key].push(check);
            return acc;
          },
          {} as Record<string, typeof taskChecks>,
        );
        let shade = true;
        Object.entries(checksBySector).forEach(([sectorName, checks]) => {
          const arr = Array.isArray(checks) ? checks : [checks];
          y = textRow(`${sectorName} : ${arr.length} vérifications effectuées`, y, shade);
          shade = !shade;
        });
      }

      y = hr(y + 4);

      // ── SECTION: Réceptions & Livraisons ──────────────────────────────────
      y = sectionHeader('Réceptions & Livraisons fournisseurs', y);
      y = kvRow('Total des réceptions', String(receptionEntries.length), y, false);
      if (receptionEntries.length === 0) {
        y = textRow('Aucune réception enregistrée sur cette période.', y, true);
      } else {
        const entriesBySupplier = receptionEntries.reduce(
          (acc, entry) => { const k = entry.supplier?.name || 'Fournisseur inconnu'; acc[k] = (acc[k] || 0) + 1; return acc; },
          {} as Record<string, number>,
        );
        let shade = true;
        Object.entries(entriesBySupplier).forEach(([supplier, count]) => {
          y = textRow(`${supplier} : ${count} livraisons`, y, shade); shade = !shade;
        });
      }

      y = hr(y + 4);

      // ── SECTION: Traçabilité des produits ─────────────────────────────────
      y = sectionHeader('Traçabilité des produits', y);
      y = textRow('Les mouvements de produits ne sont pas encore tracés dans le système.', y, false);
      y = textRow("Les produits sont gérés avec suivi de création et de date d'expiration.", y, true);

      y = hr(y + 4);

      // ── SECTION: Lots DLC ─────────────────────────────────────────────────
      y = sectionHeader('Création de lots DLC & Étiquettes', y);
      y = kvRow('Total des lots DLC', String(dlcBatches.length), y, false);
      if (dlcBatches.length === 0) {
        y = textRow('Aucun lot DLC créé sur cette période.', y, true);
      } else {
        const batchesByTemplate = dlcBatches.reduce(
          (acc, batch) => { const k = batch.internalPreparation?.name || 'Produit inconnu'; acc[k] = (acc[k] || 0) + 1; return acc; },
          {} as Record<string, number>,
        );
        let shade = true;
        Object.entries(batchesByTemplate).forEach(([template, count]) => {
          y = textRow(`${template} : ${count} lots`, y, shade); shade = !shade;
        });
      }

      y = hr(y + 4);

      // ── SECTION: Support & Communication ──────────────────────────────────
      y = sectionHeader('Support & Communication', y);
      y = kvRow('Total des tickets support', String(supportTickets.length), y, false);
      if (supportTickets.length === 0) {
        y = textRow('Aucun ticket support créé sur cette période.', y, true);
      } else {
        const ticketsByStatus = supportTickets.reduce(
          (acc, ticket) => { const k = ticket.status || 'OPEN'; acc[k] = (acc[k] || 0) + 1; return acc; },
          {} as Record<string, number>,
        );
        let shade = true;
        Object.entries(ticketsByStatus).forEach(([status, count]) => {
          y = kvRow(status, String(count), y, shade); shade = !shade;
        });
      }

      y = hr(y + 4);

      // ── SECTION: Documents PMS ────────────────────────────────────────────
      y = sectionHeader('Documents PMS de conformité', y);
      y = kvRow('Total des documents PMS', String(pmsDocuments.length), y, false);
      if (pmsDocuments.length === 0) {
        y = textRow('Aucun document PMS téléchargé.', y, true);
      } else {
        pmsDocuments.slice(0, 3).forEach((docItem, i) => {
          y = textRow(
            `${docItem.originalName}  (${new Date(docItem.uploadedAt).toLocaleDateString('fr-FR')})`,
            y, i % 2 !== 0,
          );
        });
        if (pmsDocuments.length > 3) {
          y = textRow(`... et ${pmsDocuments.length - 3} document(s) supplémentaire(s)`, y, pmsDocuments.length % 2 !== 0);
        }
      }

      y = hr(y + 4);

      // ── SECTION: Inventaire des équipements ───────────────────────────────
      y = sectionHeader('Inventaire des équipements', y);
      y = kvRow('Total des équipements', String(equipmentChanges.length), y, false);
      if (equipmentChanges.length > 0) {
        const updatedInPeriod = equipmentChanges
          .filter(eq => eq.updatedAt >= periodStart && eq.updatedAt <= periodEnd).length;
        y = kvRow('Mis à jour sur la période', String(updatedInPeriod), y, true);
      }

      y = hr(y + 4);

      // ── SECTION: Journal d'audit ──────────────────────────────────────────
      y = sectionHeader("Résumé du journal d'audit", y);
      y = kvRow("Total des entrées d'audit", String(auditLogsCount), y, false);
      y = kvRow(
        'Période couverte',
        `${periodStart.toLocaleDateString('fr-FR')} — ${periodEnd.toLocaleDateString('fr-FR')}`,
        y, true,
      );

      y += 20;

      // ── FOOTER ────────────────────────────────────────────────────────────
      const FOOTER_H = 46;
      const footerY = ensureSpace(FOOTER_H, y);

      doc.rect(M, footerY, CW, FOOTER_H).fill(C.slate50);
      doc.moveTo(M, footerY).lineTo(M + CW, footerY)
        .strokeColor(C.slate300).lineWidth(0.75).stroke();

      doc.fillColor(C.slate600).fontSize(7.5).font('Helvetica')
        .text(
          "Ce rapport HACCP est généré automatiquement. Pour plus d'informations ou en cas de questions, veuillez contacter le responsable de votre établissement.",
          M + 10, footerY + 10,
          { width: CW - 20, align: 'center' },
        );

      doc.fillColor(C.slate400).fontSize(7).font('Helvetica')
        .text(
          `ID du document : ${establishmentId.substring(0, 8)}   •   Généré le : ${new Date().toLocaleString('fr-FR')}`,
          M + 10, footerY + 30,
          { width: CW - 20, align: 'center', lineBreak: false },
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
      .text('Rapport HACCP', { align: 'center' });
    doc.moveDown();
    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Établissement : ${establishment?.name || 'N/A'}`);
    doc.text(
      `Période : ${periodStart.toLocaleDateString('fr-FR')} - ${periodEnd.toLocaleDateString('fr-FR')}`,
    );
    doc.text(`Généré le : ${new Date().toLocaleString('fr-FR')}`);
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text('Rapport HACCP généré');
    doc.fontSize(10).font('Helvetica').text('Agrégation des données terminée.');

    doc.end();

    return doc as unknown as Readable;
  }
}
