-- CreateEnum
CREATE TYPE "ReceptionCategory" AS ENUM ('FRAIS', 'SEC', 'SURGELE');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'SUPPLIER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SUPPLIER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SUPPLIER_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'RECEPTION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'RECEPTION_DELETED';

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReception" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "category" "ReceptionCategory" NOT NULL,
    "temperature" DOUBLE PRECISION,
    "orderNumber" TEXT,
    "invoiceNumber" TEXT,
    "packagingOk" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsReception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoodsReceptionPhoto" (
    "id" TEXT NOT NULL,
    "receptionId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoodsReceptionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_establishmentId_idx" ON "Supplier"("establishmentId");

-- CreateIndex
CREATE INDEX "GoodsReception_establishmentId_createdAt_idx" ON "GoodsReception"("establishmentId", "createdAt");

-- CreateIndex
CREATE INDEX "GoodsReception_supplierId_idx" ON "GoodsReception"("supplierId");

-- CreateIndex
CREATE INDEX "GoodsReception_createdBy_idx" ON "GoodsReception"("createdBy");

-- CreateIndex
CREATE INDEX "GoodsReceptionPhoto_receptionId_idx" ON "GoodsReceptionPhoto"("receptionId");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReception" ADD CONSTRAINT "GoodsReception_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReception" ADD CONSTRAINT "GoodsReception_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReception" ADD CONSTRAINT "GoodsReception_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoodsReceptionPhoto" ADD CONSTRAINT "GoodsReceptionPhoto_receptionId_fkey" FOREIGN KEY ("receptionId") REFERENCES "GoodsReception"("id") ON DELETE CASCADE ON UPDATE CASCADE;
