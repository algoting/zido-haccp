-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('RAW', 'COOKED', 'OPENED', 'PREPARED');

-- CreateEnum
CREATE TYPE "ShelfLifeUnit" AS ENUM ('HOURS', 'DAYS');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('VALID', 'EXPIRING', 'EXPIRED', 'DESTROYED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_TEMPLATE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_TEMPLATE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PRODUCT_TEMPLATE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'SHELF_LIFE_RULE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SHELF_LIFE_RULE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SHELF_LIFE_RULE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'BATCH_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'BATCH_DESTROYED';

-- CreateTable
CREATE TABLE "ProductTemplate" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "description" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShelfLifeRule" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "shelfLifeValue" INTEGER NOT NULL,
    "shelfLifeUnit" "ShelfLifeUnit" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShelfLifeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productionDate" TIMESTAMP(3) NOT NULL,
    "calculatedDlc" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'VALID',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchDestruction" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "quantityDestroyed" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "destroyedBy" TEXT NOT NULL,
    "destroyedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchDestruction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductTemplate_establishmentId_createdAt_idx" ON "ProductTemplate"("establishmentId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductTemplate_createdBy_idx" ON "ProductTemplate"("createdBy");

-- CreateIndex
CREATE INDEX "ShelfLifeRule_establishmentId_productId_idx" ON "ShelfLifeRule"("establishmentId", "productId");

-- CreateIndex
CREATE INDEX "ShelfLifeRule_createdBy_idx" ON "ShelfLifeRule"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "ShelfLifeRule_productId_establishmentId_key" ON "ShelfLifeRule"("productId", "establishmentId");

-- CreateIndex
CREATE INDEX "Batch_establishmentId_calculatedDlc_idx" ON "Batch"("establishmentId", "calculatedDlc");

-- CreateIndex
CREATE INDEX "Batch_productId_idx" ON "Batch"("productId");

-- CreateIndex
CREATE INDEX "Batch_status_idx" ON "Batch"("status");

-- CreateIndex
CREATE INDEX "Batch_createdBy_idx" ON "Batch"("createdBy");

-- CreateIndex
CREATE INDEX "BatchDestruction_batchId_idx" ON "BatchDestruction"("batchId");

-- CreateIndex
CREATE INDEX "BatchDestruction_destroyedBy_idx" ON "BatchDestruction"("destroyedBy");

-- AddForeignKey
ALTER TABLE "ProductTemplate" ADD CONSTRAINT "ProductTemplate_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTemplate" ADD CONSTRAINT "ProductTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShelfLifeRule" ADD CONSTRAINT "ShelfLifeRule_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShelfLifeRule" ADD CONSTRAINT "ShelfLifeRule_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShelfLifeRule" ADD CONSTRAINT "ShelfLifeRule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProductTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchDestruction" ADD CONSTRAINT "BatchDestruction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchDestruction" ADD CONSTRAINT "BatchDestruction_destroyedBy_fkey" FOREIGN KEY ("destroyedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
