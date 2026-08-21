-- AlterTable: add recipe fields to PreparationBatch and make internalPreparationId optional
ALTER TABLE "PreparationBatch"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "shelfLifeDays" INTEGER,
  ADD COLUMN IF NOT EXISTS "shelfLifeHours" INTEGER,
  ADD COLUMN IF NOT EXISTS "photoUrl" TEXT,
  ALTER COLUMN "internalPreparationId" DROP NOT NULL;
