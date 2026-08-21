const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const es = await p.equipmentSector.count();
  const cs = await p.cleaningSector.count();
  const eq = await p.equipment.count({ where: { status: 'ACTIVE' } });
  console.log('Equipment sectors:', es);
  console.log('Cleaning sectors:', cs);
  console.log('Active equipment:', eq);
  await p.$disconnect();
})();
