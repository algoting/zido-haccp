const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false`);
    console.log('Added emailVerified column');
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT`);
    console.log('Added emailVerificationToken column');
    // Mark all existing users as verified so they don't get locked out
    const result = await prisma.$executeRawUnsafe(`UPDATE "User" SET "emailVerified" = true WHERE "passwordHash" IS NOT NULL`);
    console.log('Marked existing users as verified:', result);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
