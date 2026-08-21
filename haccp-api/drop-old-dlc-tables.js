require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

// Read DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL;
console.log('DATABASE_URL exists:', !!databaseUrl);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function dropOldTables() {
  try {
    console.log('Dropping old DLC tables...');
    
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Batch" CASCADE');
    console.log('✓ Dropped Batch table');
    
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "ProductTemplate" CASCADE');
    console.log('✓ Dropped ProductTemplate table');
    
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "ShelfLifeRule" CASCADE');
    console.log('✓ Dropped ShelfLifeRule table');
    
    console.log('\n✅ All old tables dropped successfully!');
    console.log('Now run: npx prisma db push');
    
  } catch (error) {
    console.error('Error dropping tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

dropOldTables();
