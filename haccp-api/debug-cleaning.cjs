const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const tasks = await p.cleaningTask.findMany({
    include: {
      equipment: {
        include: { sector: true },
      },
    },
  });
  console.log('Total cleaning tasks:', tasks.length);
  for (const t of tasks) {
    console.log(' -', t.equipment.sector.name, '>', t.equipment.name, '>', t.name, '(' + t.frequency + ') estId:', t.equipment.sector.establishmentId);
  }

  const dateKey = new Date().toISOString().slice(0, 10);
  console.log('DateKey:', dateKey);
  const plans = await p.cleaningPlan.findMany({
    where: { dateKey },
    include: { taskChecks: true },
  });
  console.log('Plans for today:', plans.length);
  for (const pl of plans) {
    console.log('  Plan', pl.establishmentId, 'completed:', !!pl.completedAt, 'checks:', pl.taskChecks.length);
  }

  await p.$disconnect();
}
main();
