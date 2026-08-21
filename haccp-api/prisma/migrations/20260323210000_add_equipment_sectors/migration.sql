-- CreateTable
CREATE TABLE "EquipmentSector" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentSector_pkey" PRIMARY KEY ("id")
);

-- Add sectorId to Equipment
ALTER TABLE "Equipment" ADD COLUMN "sectorId" TEXT;

-- CreateIndex
CREATE INDEX "EquipmentSector_establishmentId_idx" ON "EquipmentSector"("establishmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentSector_establishmentId_name_key" ON "EquipmentSector"("establishmentId", "name");

-- CreateIndex
CREATE INDEX "Equipment_sectorId_idx" ON "Equipment"("sectorId");

-- AddForeignKey
ALTER TABLE "EquipmentSector" ADD CONSTRAINT "EquipmentSector_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "EquipmentSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
