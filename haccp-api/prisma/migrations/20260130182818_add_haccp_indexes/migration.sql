-- CreateIndex
CREATE INDEX "Equipment_establishmentId_idx" ON "Equipment"("establishmentId");

-- CreateIndex
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");

-- CreateIndex
CREATE INDEX "Incident_establishmentId_idx" ON "Incident"("establishmentId");

-- CreateIndex
CREATE INDEX "Incident_equipmentId_idx" ON "Incident"("equipmentId");

-- CreateIndex
CREATE INDEX "Incident_status_openedAt_idx" ON "Incident"("status", "openedAt");

-- CreateIndex
CREATE INDEX "TemperatureLog_establishmentId_idx" ON "TemperatureLog"("establishmentId");

-- CreateIndex
CREATE INDEX "TemperatureLog_equipmentId_measuredAt_idx" ON "TemperatureLog"("equipmentId", "measuredAt");
