const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const user = await p.user.findFirst({
    where: { email: 'shiftup01@gmail.com' },
    select: { id: true, email: true, establishmentId: true, role: true },
  });
  console.log('User:', JSON.stringify(user));

  if (user && user.establishmentId) {
    const sectors = await p.cleaningSector.findMany({
      where: { establishmentId: user.establishmentId },
      include: { equipment: { include: { tasks: true } } },
    });
    console.log('Cleaning sectors for user establishment:', sectors.length);
    for (const s of sectors) {
      console.log('  Sector:', s.name, 'equipment:', s.equipment.length);
      for (const eq of s.equipment) {
        console.log('    Equipment:', eq.name, 'tasks:', eq.tasks.length);
        for (const t of eq.tasks) {
          console.log('      Task:', t.name, t.frequency);
        }
      }
    }
  }

  await p.$disconnect();
}
main();
