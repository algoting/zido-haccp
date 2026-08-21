const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$executeRawUnsafe(`ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RECEPTION_UPDATED'`)
  .then(() => console.log('RECEPTION_UPDATED enum value added'))
  .catch(e => console.error('Error (may already exist):', e.message))
  .finally(() => p.$disconnect());
