const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const hash = await bcrypt.hash('Lesucre3107(', 10);
    const user = await prisma.user.create({
      data: {
        email: 'shiftup01@gmail.com',
        role: 'PLATFORM_ADMIN',
        passwordHash: hash,
      },
    });
    console.log('Admin created:', user.id, user.email, user.role);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
