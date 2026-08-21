-- Drop old DLC tables from previous implementation
DROP TABLE IF EXISTS "Batch" CASCADE;
DROP TABLE IF EXISTS "ProductTemplate" CASCADE;
DROP TABLE IF EXISTS "ShelfLifeRule" CASCADE;

-- Drop and recreate BatchStatus enum with new values
DROP TYPE IF EXISTS "BatchStatus" CASCADE;
CREATE TYPE "BatchStatus" AS ENUM ('PREPARED', 'STORED', 'VALID', 'EXPIRING_SOON', 'EXPIRED', 'DESTROYED');

-- InternalPreparation table
CREATE TABLE IF NOT EXISTS "InternalPreparation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "shelfLifeDays" INTEGER NOT NULL,
    "shelfLifeHours" INTEGER NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalPreparation_pkey" PRIMARY KEY ("id")
);

-- PreparationBatch table
CREATE TABLE IF NOT EXISTS "PreparationBatch" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "internalPreparationId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "productionDateTime" TIMESTAMP(3) NOT NULL,
    "dlc" TIMESTAMP(3) NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'PREPARED',
    "establishmentId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "destroyedAt" TIMESTAMP(3),
    "destroyedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreparationBatch_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for batchId
CREATE UNIQUE INDEX IF NOT EXISTS "PreparationBatch_batchId_key" ON "PreparationBatch"("batchId");

-- Create indexes
CREATE INDEX IF NOT EXISTS "InternalPreparation_establishmentId_idx" ON "InternalPreparation"("establishmentId");
CREATE INDEX IF NOT EXISTS "PreparationBatch_establishmentId_idx" ON "PreparationBatch"("establishmentId");
CREATE INDEX IF NOT EXISTS "PreparationBatch_status_idx" ON "PreparationBatch"("status");
CREATE INDEX IF NOT EXISTS "PreparationBatch_dlc_idx" ON "PreparationBatch"("dlc");

-- Add foreign keys
ALTER TABLE "InternalPreparation" ADD CONSTRAINT "InternalPreparation_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InternalPreparation" ADD CONSTRAINT "InternalPreparation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PreparationBatch" ADD CONSTRAINT "PreparationBatch_internalPreparationId_fkey" FOREIGN KEY ("internalPreparationId") REFERENCES "InternalPreparation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PreparationBatch" ADD CONSTRAINT "PreparationBatch_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PreparationBatch" ADD CONSTRAINT "PreparationBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PreparationBatch" ADD CONSTRAINT "PreparationBatch_destroyedByUserId_fkey" FOREIGN KEY ("destroyedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update AuditAction enum (remove old values, add new ones)
-- Note: Removing enum values requires recreating the enum or using a migration
-- For simplicity, we'll add new values if they don't exist
DO $$ BEGIN
 ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INTERNAL_PREPARATION_CREATED';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INTERNAL_PREPARATION_UPDATED';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INTERNAL_PREPARATION_DELETED';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PREPARATION_BATCH_CREATED';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PREPARATION_BATCH_DESTROYED';
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
