-- CreateTable
CREATE TABLE "CleaningItemCheck" (
    "id" TEXT NOT NULL,
    "cleaningRunId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "checkedByUserId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningItemCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CleaningItemCheck_cleaningRunId_idx" ON "CleaningItemCheck"("cleaningRunId");

-- CreateIndex
CREATE INDEX "CleaningItemCheck_checkedByUserId_idx" ON "CleaningItemCheck"("checkedByUserId");

-- AddForeignKey
ALTER TABLE "CleaningItemCheck" ADD CONSTRAINT "CleaningItemCheck_cleaningRunId_fkey" FOREIGN KEY ("cleaningRunId") REFERENCES "CleaningRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningItemCheck" ADD CONSTRAINT "CleaningItemCheck_checkedByUserId_fkey" FOREIGN KEY ("checkedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
