const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting local database seed...');

  // 1. Platform Admin
  const adminPassword = await bcrypt.hash('Lesucre3107(', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'shiftup01@gmail.com' },
    update: {
      passwordHash: adminPassword,
      role: 'PLATFORM_ADMIN',
      emailVerified: true,
      suspended: false,
    },
    create: {
      email: 'shiftup01@gmail.com',
      displayName: 'Platform Admin',
      role: 'PLATFORM_ADMIN',
      passwordHash: adminPassword,
      emailVerified: true,
      suspended: false,
    },
  });
  console.log('✅ Admin user created/updated:', admin.email);

  // 2. Owner User
  const ownerPassword = await bcrypt.hash('Admin123!', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'admin@haccp.local' },
    update: {
      passwordHash: ownerPassword,
      role: 'OWNER',
      emailVerified: true,
      suspended: false,
    },
    create: {
      email: 'admin@haccp.local',
      displayName: 'Restaurant Owner',
      role: 'OWNER',
      passwordHash: ownerPassword,
      emailVerified: true,
      suspended: false,
    },
  });
  console.log('✅ Owner user created/updated:', owner.email);

  // 3. Establishment
  let establishment = await prisma.establishment.findFirst({
    where: { ownerId: owner.id },
  });

  if (!establishment) {
    establishment = await prisma.establishment.create({
      data: {
        name: 'Le Bistro Gourmand',
        address: '12 Rue de la Paix, 75001 Paris',
        phone: '+33 1 23 45 67 89',
        timezone: 'Europe/Paris',
        active: true,
        ownerId: owner.id,
      },
    });
    console.log('✅ Establishment created:', establishment.name);
  }

  // Update owner's establishmentId
  await prisma.user.update({
    where: { id: owner.id },
    data: { establishmentId: establishment.id },
  });

  // 4. Subscription (SERENITE)
  const existingSub = await prisma.subscription.findUnique({
    where: { establishmentId: establishment.id },
  });

  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  if (!existingSub) {
    await prisma.subscription.create({
      data: {
        establishmentId: establishment.id,
        plan: 'SERENITE',
        status: 'ACTIVE',
        currentPeriodEnd: nextYear,
        lastPaymentAt: new Date(),
      },
    });
    console.log('✅ Subscription (SERENITE) created for establishment');
  }

  // 5. Default Equipment Sectors & Equipment
  const sectorCuisine = await prisma.equipmentSector.upsert({
    where: {
      establishmentId_name: {
        establishmentId: establishment.id,
        name: 'Cuisine Chaude',
      },
    },
    update: {},
    create: {
      establishmentId: establishment.id,
      name: 'Cuisine Chaude',
      order: 1,
    },
  });

  const sectorFroid = await prisma.equipmentSector.upsert({
    where: {
      establishmentId_name: {
        establishmentId: establishment.id,
        name: 'Chambre Froide & Stockage',
      },
    },
    update: {},
    create: {
      establishmentId: establishment.id,
      name: 'Chambre Froide & Stockage',
      order: 2,
    },
  });

  // Equipment: Frigo Positif
  const frigo = await prisma.equipment.findFirst({
    where: { establishmentId: establishment.id, name: 'Chambre Froide Positive 1' },
  });
  if (!frigo) {
    await prisma.equipment.create({
      data: {
        name: 'Chambre Froide Positive 1',
        type: 'COLD_STORAGE',
        minTempC: 0.0,
        maxTempC: 4.0,
        establishmentId: establishment.id,
        sectorId: sectorFroid.id,
        createdByUserId: owner.id,
      },
    });
  }

  // Equipment: Bain-Marie
  const bainMarie = await prisma.equipment.findFirst({
    where: { establishmentId: establishment.id, name: 'Bain-Marie Service' },
  });
  if (!bainMarie) {
    await prisma.equipment.create({
      data: {
        name: 'Bain-Marie Service',
        type: 'HOT_HOLDING',
        minTempC: 63.0,
        maxTempC: 85.0,
        establishmentId: establishment.id,
        sectorId: sectorCuisine.id,
        createdByUserId: owner.id,
      },
    });
  }

  console.log('🎉 Seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
