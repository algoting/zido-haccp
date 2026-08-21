const { PrismaClient } = require('@prisma/client');

async function getEstablishments() {
  const prisma = new PrismaClient();

  try {
    const establishments = await prisma.establishment.findMany({
      select: { id: true, name: true }
    });
    console.log('Establishments:', establishments);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getEstablishments();