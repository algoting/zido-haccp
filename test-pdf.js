const { PrismaClient } = require('@prisma/client');
const { PdfService } = require('./dist/exports/pdf.service');
const fs = require('fs');

async function testPdfReport() {
  const prisma = new PrismaClient();
  const pdfService = new PdfService(prisma);

  try {
    // Use a test establishment ID - you'll need to replace this with a real one
    const establishmentId = 'your-establishment-id-here';

    // Use a date range that should have no data
    const periodStart = new Date('2026-01-01');
    const periodEnd = new Date('2026-01-31');

    console.log('Generating PDF report...');
    const pdfBuffer = await pdfService.generateHACCPReport(establishmentId, periodStart, periodEnd);

    // Save to file for inspection
    fs.writeFileSync('test-report.pdf', pdfBuffer);
    console.log('PDF saved to test-report.pdf');

    // Extract text using pdf-parse if available
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(pdfBuffer);
      const text = data.text;

      console.log('\n=== PDF TEXT EXTRACTION ===');
      console.log(text);

      // Check for specific sections
      const sections = [
        'Cleaning Plans Created: 0',
        'Completed: 0',
        'Pending: 0',
        'Task Checks Done: 0',
        'Total Temperature Logs: 0',
        'Total Incidents: 0',
        'Total Corrective Actions: 0',
        'Total Reception Entries: 0',
        'Total DLC Batches: 0',
        'Total Support Tickets: 0',
        'Total PMS Documents: 0',
        'Total Audit Log Entries: 0'
      ];

      console.log('\n=== SECTION CHECKS ===');
      sections.forEach(section => {
        const found = text.includes(section);
        console.log(`${section}: ${found ? '✅ FOUND' : '❌ MISSING'}`);
      });

    } catch (e) {
      console.log('pdf-parse not available, but PDF was generated successfully');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPdfReport();