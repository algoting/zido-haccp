const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check all establishments
  const establishments = await prisma.establishment.findMany({
    select: { id: true, name: true }
  });
  console.log('All establishments:', JSON.stringify(establishments, null, 2));
  
  // Check for any data without establishmentId
  const [orphanedEquipment, orphanedTempLogs, orphanedIncidents] = await Promise.all([
    prisma.equipment.count({ where: { establishmentId: null } }),
    prisma.temperatureLog.count({ where: { establishmentId: null } }),
    prisma.incident.count({ where: { establishmentId: null } }),
  ]);
  
  console.log('\nOrphaned data (no establishmentId):');
  console.log('Equipment:', orphanedEquipment);
  console.log('Temperature Logs:', orphanedTempLogs);
  console.log('Incidents:', orphanedIncidents);
  
  // Check data per establishment
  for (const est of establishments) {
    const [equipment, tempLogs, incidents, openIncidents] = await Promise.all([
      prisma.equipment.count({ where: { establishmentId: est.id } }),
      prisma.temperatureLog.count({ where: { establishmentId: est.id } }),
      prisma.incident.count({ where: { establishmentId: est.id } }),
      prisma.incident.count({ where: { establishmentId: est.id, status: 'OPEN' } }),
    ]);
    console.log(`\n${est.name} (${est.id}):`);
    console.log('  Equipment:', equipment);
    console.log('  Temperature Logs:', tempLogs);
    console.log('  Incidents (total):', incidents);
    console.log('  Incidents (OPEN):', openIncidents);
  }
  
  await prisma.$disconnect();
}

main();

