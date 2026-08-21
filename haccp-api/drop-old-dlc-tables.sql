-- Drop old DLC tables from previous implementation
DROP TABLE IF EXISTS "Batch" CASCADE;
DROP TABLE IF EXISTS "ProductTemplate" CASCADE;
DROP TABLE IF EXISTS "ShelfLifeRule" CASCADE;

-- Remove old enum values if they exist
-- Note: This will be handled by Prisma automatically
