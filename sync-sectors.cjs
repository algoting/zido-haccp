const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all equipment sectors with their equipment
  const eqSectors = await prisma.equipmentSector.findMany({
    include: { equipment: { where: { status: 'ACTIVE' } } },
  });

  console.log(`Found ${eqSectors.length} equipment sector(s)`);

  for (const eqSector of eqSectors) {
    // 1. Ensure matching cleaning sector exists
    let cleaningSector = await prisma.cleaningSector.findUnique({
      where: {
        establishmentId_name: {
          establishmentId: eqSector.establishmentId,
          name: eqSector.name,
        },
      },
    });

    if (!cleaningSector) {
      cleaningSector = await prisma.cleaningSector.create({
        data: {
          establishmentId: eqSector.establishmentId,
          name: eqSector.name,
          order: eqSector.order,
        },
      });
      console.log(`  Created cleaning sector: "${eqSector.name}"`);
    } else {
      console.log(`  Cleaning sector "${eqSector.name}" already exists`);
    }

    // 2. Ensure each equipment in this sector has a matching cleaning equipment
    for (const eq of eqSector.equipment) {
      const existing = await prisma.cleaningEquipment.findUnique({
        where: {
          sectorId_name: {
            sectorId: cleaningSector.id,
            name: eq.name,
          },
        },
      });

      if (!existing) {
        await prisma.cleaningEquipment.create({
          data: {
            sectorId: cleaningSector.id,
            name: eq.name,
          },
        });
        console.log(`    Added cleaning equipment: "${eq.name}" -> "${eqSector.name}"`);
      } else {
        console.log(`    Cleaning equipment "${eq.name}" already exists in "${eqSector.name}"`);
      }
    }
  }

  console.log('Done!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
