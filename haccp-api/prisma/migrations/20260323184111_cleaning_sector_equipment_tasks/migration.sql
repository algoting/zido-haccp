-- CreateEnum
CREATE TYPE "CleaningFrequency" AS ENUM ('DAILY', 'WEEKLY');

-- DropForeignKey (old cleaning models)
ALTER TABLE "CleaningItemCheck" DROP CONSTRAINT IF EXISTS "CleaningItemCheck_checkedByUserId_fkey";
ALTER TABLE "CleaningItemCheck" DROP CONSTRAINT IF EXISTS "CleaningItemCheck_cleaningRunId_fkey";
ALTER TABLE "CleaningRun" DROP CONSTRAINT IF EXISTS "CleaningRun_completedByUserId_fkey";
ALTER TABLE "CleaningRun" DROP CONSTRAINT IF EXISTS "CleaningRun_establishmentId_fkey";
ALTER TABLE "CleaningTemplate" DROP CONSTRAINT IF EXISTS "CleaningTemplate_establishmentId_fkey";

-- DropTable (old cleaning models)
DROP TABLE IF EXISTS "CleaningItemCheck";
DROP TABLE IF EXISTS "CleaningRun";
DROP TABLE IF EXISTS "CleaningTemplate";

-- CreateTable: CleaningSector
CREATE TABLE "CleaningSector" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningSector_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CleaningEquipment
CREATE TABLE "CleaningEquipment" (
    "id" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CleaningTask
CREATE TABLE "CleaningTask" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" "CleaningFrequency" NOT NULL DEFAULT 'DAILY',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CleaningPlan
CREATE TABLE "CleaningPlan" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CleaningTaskCheck
CREATE TABLE "CleaningTaskCheck" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "checkedByUserId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningTaskCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CleaningSector_establishmentId_idx" ON "CleaningSector"("establishmentId");
CREATE UNIQUE INDEX "CleaningSector_establishmentId_name_key" ON "CleaningSector"("establishmentId", "name");

CREATE INDEX "CleaningEquipment_sectorId_idx" ON "CleaningEquipment"("sectorId");
CREATE UNIQUE INDEX "CleaningEquipment_sectorId_name_key" ON "CleaningEquipment"("sectorId", "name");

CREATE INDEX "CleaningTask_equipmentId_idx" ON "CleaningTask"("equipmentId");
CREATE UNIQUE INDEX "CleaningTask_equipmentId_name_key" ON "CleaningTask"("equipmentId", "name");

CREATE INDEX "CleaningPlan_establishmentId_idx" ON "CleaningPlan"("establishmentId");
CREATE INDEX "CleaningPlan_dateKey_idx" ON "CleaningPlan"("dateKey");
CREATE UNIQUE INDEX "CleaningPlan_establishmentId_dateKey_key" ON "CleaningPlan"("establishmentId", "dateKey");

CREATE INDEX "CleaningTaskCheck_planId_idx" ON "CleaningTaskCheck"("planId");
CREATE INDEX "CleaningTaskCheck_taskId_idx" ON "CleaningTaskCheck"("taskId");
CREATE INDEX "CleaningTaskCheck_checkedByUserId_idx" ON "CleaningTaskCheck"("checkedByUserId");
CREATE UNIQUE INDEX "CleaningTaskCheck_planId_taskId_key" ON "CleaningTaskCheck"("planId", "taskId");

-- AddForeignKey
ALTER TABLE "CleaningSector" ADD CONSTRAINT "CleaningSector_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleaningEquipment" ADD CONSTRAINT "CleaningEquipment_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "CleaningSector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleaningTask" ADD CONSTRAINT "CleaningTask_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "CleaningEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleaningPlan" ADD CONSTRAINT "CleaningPlan_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleaningTaskCheck" ADD CONSTRAINT "CleaningTaskCheck_planId_fkey" FOREIGN KEY ("planId") REFERENCES "CleaningPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleaningTaskCheck" ADD CONSTRAINT "CleaningTaskCheck_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CleaningTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CleaningTaskCheck" ADD CONSTRAINT "CleaningTaskCheck_checkedByUserId_fkey" FOREIGN KEY ("checkedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
