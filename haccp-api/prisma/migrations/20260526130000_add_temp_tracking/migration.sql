-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TempTrackingAction" AS ENUM ('CUISSON', 'REFROIDISSEMENT', 'MAINTIEN_CHAUD', 'SURGELATION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "TempTracking" (
  "id" TEXT NOT NULL,
  "action" "TempTrackingAction" NOT NULL,
  "productName" TEXT,
  "photoUrl" TEXT,
  "startTime" TIMESTAMP(3) NOT NULL,
  "startTemp" DOUBLE PRECISION NOT NULL,
  "endTime" TIMESTAMP(3),
  "endTemp" DOUBLE PRECISION,
  "establishmentId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "TempTracking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TempTracking_establishmentId_idx" ON "TempTracking"("establishmentId");
CREATE INDEX IF NOT EXISTS "TempTracking_action_idx" ON "TempTracking"("action");
CREATE INDEX IF NOT EXISTS "TempTracking_createdAt_idx" ON "TempTracking"("createdAt");

ALTER TABLE "TempTracking"
  ADD CONSTRAINT "TempTracking_establishmentId_fkey"
  FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TempTracking"
  ADD CONSTRAINT "TempTracking_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
