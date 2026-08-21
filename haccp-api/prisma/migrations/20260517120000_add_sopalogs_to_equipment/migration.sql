-- Add sopalogs integration fields to Equipment table
ALTER TABLE "Equipment" ADD COLUMN "sopalogDeviceId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN "sopalogApiKey" TEXT;
ALTER TABLE "Equipment" ADD COLUMN "lastSopalogSync" TIMESTAMP(3);

-- Create index on sopalogDeviceId for quick lookups
CREATE INDEX "Equipment_sopalogDeviceId_idx" ON "Equipment"("sopalogDeviceId");
