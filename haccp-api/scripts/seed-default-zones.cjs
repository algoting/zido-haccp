/**
 * Migration: ensure every sector has at least 1 daily task.
 * Also creates the 6 default zones for any establishment missing them.
 * Safe to run multiple times.
 */
const { PrismaClient } = require('@prisma/client');

const DEFAULT_ZONES = [
  { name: 'Zone de service', icon: '👨‍🍳', order: 0 },
  { name: 'Cuisine',         icon: '🍳',   order: 1 },
  { name: 'Toilette',        icon: '🚽',   order: 2 },
  { name: 'Réserve',         icon: '📦',   order: 3 },
  { name: 'Plonge',          icon: '🚿',   order: 4 },
  { name: 'Livraison',       icon: '📮',   order: 5 },
];

async function ensureDefaultTask(prisma, sector) {
  // Count existing tasks across all subsectors/equipment
  const tasks = await prisma.cleaningTask.findMany({
    where: { equipment: { subSector: { sectorId: sector.id } } },
  });
  if (tasks.length > 0) return; // already has tasks

  // Find or create "Général" subsector
  let subSector = await prisma.cleaningSubSector.findFirst({
    where: { sectorId: sector.id, name: 'Général' },
  });
  if (!subSector) {
    subSector = await prisma.cleaningSubSector.create({
      data: { sectorId: sector.id, name: 'Général', icon: '🧹', order: 0 },
    });
  }

  // Find or create "Nettoyage" equipment
  let equipment = await prisma.cleaningEquipment.findFirst({
    where: { subSectorId: subSector.id, name: 'Nettoyage' },
  });
  if (!equipment) {
    equipment = await prisma.cleaningEquipment.create({
      data: { subSectorId: subSector.id, name: 'Nettoyage', order: 0 },
    });
  }

  await prisma.cleaningTask.create({
    data: { equipmentId: equipment.id, name: 'Nettoyage quotidien', frequency: 'DAILY', order: 0 },
  });
  console.log(`    → Added default task to "${sector.name}"`);
}

async function main() {
  const prisma = new PrismaClient();
  const establishments = await prisma.establishment.findMany({ select: { id: true, name: true } });
  console.log(`Found ${establishments.length} establishment(s)\n`);

  for (const est of establishments) {
    console.log(`[${est.name}]`);
    const existing = await prisma.cleaningSector.findMany({
      where: { establishmentId: est.id },
      select: { id: true, name: true },
    });
    const existingNames = new Set(existing.map(s => s.name));

    // 1. Create any missing default zones
    for (const zone of DEFAULT_ZONES) {
      if (existingNames.has(zone.name)) continue;
      const sector = await prisma.cleaningSector.create({
        data: { establishmentId: est.id, name: zone.name, icon: zone.icon, order: zone.order, isSystemZone: true },
      });
      const subSector = await prisma.cleaningSubSector.create({
        data: { sectorId: sector.id, name: 'Général', icon: '🧹', order: 0 },
      });
      const equipment = await prisma.cleaningEquipment.create({
        data: { subSectorId: subSector.id, name: 'Nettoyage', order: 0 },
      });
      await prisma.cleaningTask.create({
        data: { equipmentId: equipment.id, name: 'Nettoyage quotidien', frequency: 'DAILY', order: 0 },
      });
      console.log(`  ✅ Created zone "${zone.name}"`);
      existing.push({ id: sector.id, name: zone.name });
    }

    // 2. Ensure every existing sector has at least 1 task
    const allSectors = await prisma.cleaningSector.findMany({
      where: { establishmentId: est.id },
      select: { id: true, name: true },
    });
    for (const sector of allSectors) {
      await ensureDefaultTask(prisma, sector);
    }
  }

  await prisma.$disconnect();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
