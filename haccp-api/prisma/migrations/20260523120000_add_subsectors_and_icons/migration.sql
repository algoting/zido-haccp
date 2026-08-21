-- Add icon column to CleaningSector
ALTER TABLE "CleaningSector" ADD COLUMN "icon" TEXT NOT NULL DEFAULT '🏢';

-- Create CleaningSubSector table
CREATE TABLE "CleaningSubSector" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sectorId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "icon" TEXT NOT NULL DEFAULT '📍',
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CleaningSubSector_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "CleaningSector" ("id") ON DELETE CASCADE
);

-- Create unique index for CleaningSubSector
CREATE UNIQUE INDEX "CleaningSubSector_sectorId_name_key" ON "CleaningSubSector"("sectorId", "name");
CREATE INDEX "CleaningSubSector_sectorId_idx" ON "CleaningSubSector"("sectorId");

-- Add subSectorId column to CleaningEquipment
ALTER TABLE "CleaningEquipment" ADD COLUMN "subSectorId" TEXT;

-- Migrate existing equipment: for each sector, create a default sub-sector and move equipment to it
INSERT INTO "CleaningSubSector" ("id", "sectorId", "name", "icon", "order", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "CleaningSector"."id",
  "CleaningSector"."name",
  '📍',
  0,
  NOW(),
  NOW()
FROM "CleaningSector";

-- Update CleaningEquipment to reference the sub-sector
UPDATE "CleaningEquipment" ce
SET "subSectorId" = ss."id"
FROM "CleaningSubSector" ss
WHERE ss."sectorId" = ce."sectorId";

-- Drop the old sectorId column from CleaningEquipment
ALTER TABLE "CleaningEquipment" DROP COLUMN "sectorId";

-- Make subSectorId NOT NULL
ALTER TABLE "CleaningEquipment" ALTER COLUMN "subSectorId" SET NOT NULL;

-- Drop old equipment constraint and add new one
ALTER TABLE "CleaningEquipment" DROP CONSTRAINT IF EXISTS "CleaningEquipment_sectorId_name_key";
ALTER TABLE "CleaningEquipment" ADD CONSTRAINT "CleaningEquipment_subSectorId_name_key" UNIQUE ("subSectorId", "name");

-- Drop old index and add new one
DROP INDEX IF EXISTS "CleaningEquipment_sectorId_idx";
CREATE INDEX "CleaningEquipment_subSectorId_idx" ON "CleaningEquipment"("subSectorId");
