import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SopalogService } from './sopalogs.service';
import { TemperatureConformity, IncidentType } from '@prisma/client';

/**
 * Sopalogs Sync Service
 * Periodically fetches temperature readings from sopalogs devices
 * and creates TemperatureLog entries
 */
@Injectable()
export class SopalogsSyncService {
  private readonly logger = new Logger(SopalogsSyncService.name);

  constructor(
    private prisma: PrismaService,
    private sopalogs: SopalogService,
  ) {}

  /**
   * Sync sopalogs data every 10 minutes
   * Configurable via SOPALOGS_SYNC_CRON env variable
   */
  @Cron(process.env.SOPALOGS_SYNC_CRON || '*/10 * * * *')
  async syncSopalogDevices() {
    this.logger.log('Starting sopalogs sync job...');

    try {
      // Find all equipment with sopalogs connected
      const equipmentWithSopalogs = await this.prisma.equipment.findMany({
        where: {
          sopalogDeviceId: { not: null },
          sopalogApiKey: { not: null },
          status: 'ACTIVE',
        },
        include: {
          establishment: true,
        },
      });

      this.logger.log(
        `Found ${equipmentWithSopalogs.length} equipment with sopalogs connected`,
      );

      for (const equipment of equipmentWithSopalogs) {
        try {
          await this.syncEquipmentFromSopalog(equipment);
        } catch (error) {
          this.logger.error(
            `Failed to sync sopalogs for equipment ${equipment.id} (${equipment.name}):`,
            error instanceof Error ? error.message : error,
          );
          // Continue with next equipment instead of stopping
        }
      }

      this.logger.log('Sopalogs sync job completed successfully');
    } catch (error) {
      this.logger.error(
        'Sopalogs sync job failed:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  /**
   * Sync a single equipment device with sopalogs
   * Fetches recent measurements and creates temperature logs
   */
  private async syncEquipmentFromSopalog(equipment: any) {
    if (!equipment.sopalogDeviceId || !equipment.sopalogApiKey) {
      return;
    }

    try {
      // Fetch recent measurements from sopalogs
      // Fetch last 100 readings to be safe
      const measurements = await this.sopalogs.getMeasurements(
        equipment.sopalogApiKey,
        equipment.sopalogDeviceId,
        100,
      );

      if (!measurements || measurements.length === 0) {
        this.logger.log(
          `No new measurements from sopalogs for device ${equipment.sopalogDeviceId}`,
        );
        return;
      }

      this.logger.log(
        `Fetched ${measurements.length} measurements from sopalogs for device ${equipment.sopalogDeviceId}`,
      );

      // Filter to only new measurements (after last sync)
      const lastSync = equipment.lastSopalogSync;
      const newMeasurements = lastSync
        ? measurements.filter(
            (m) =>
              new Date(m.timestamp) > lastSync,
          )
        : measurements;

      this.logger.log(
        `Processing ${newMeasurements.length} new measurements`,
      );

      // Create temperature logs for each new measurement
      for (const measurement of newMeasurements) {
        await this.createTemperatureLogFromMeasurement(equipment, measurement);
      }

      // Update last sync time
      await this.prisma.equipment.update({
        where: { id: equipment.id },
        data: {
          lastSopalogSync: new Date(),
        },
      });

      this.logger.log(
        `Successfully synced ${newMeasurements.length} measurements for equipment ${equipment.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error syncing sopalogs for equipment ${equipment.id}:`,
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }

  /**
   * Create a TemperatureLog from a sopalogs measurement
   * Auto-creates incidents if temperature is out of range
   */
  private async createTemperatureLogFromMeasurement(equipment: any, measurement: any) {
    try {
      // Extract temperature (assuming measurement has a 'temperature' field)
      const temperatureC = Number(measurement.temperature);
      if (isNaN(temperatureC)) {
        this.logger.warn(
          `Invalid temperature value from sopalogs: ${measurement.temperature}`,
        );
        return;
      }

      // Check if log already exists for this timestamp
      const existingLog = await this.prisma.temperatureLog.findFirst({
        where: {
          equipmentId: equipment.id,
          measuredAt: new Date(measurement.timestamp),
        },
      });

      if (existingLog) {
        this.logger.debug(
          `Temperature log already exists for equipment ${equipment.id} at ${measurement.timestamp}`,
        );
        return;
      }

      // Determine conformity
      const conformity =
        temperatureC < equipment.minTempC || temperatureC > equipment.maxTempC
          ? TemperatureConformity.OUT_OF_RANGE
          : TemperatureConformity.OK;

      // Create temperature log
      const log = await this.prisma.temperatureLog.create({
        data: {
          equipmentId: equipment.id,
          establishmentId: equipment.establishmentId,
          temperatureC,
          measuredAt: new Date(measurement.timestamp),
          conformity,
          recordedByUserId: null, // Sopalogs automatic recording
        },
      });

      // If out of range, create incident
      if (conformity === TemperatureConformity.OUT_OF_RANGE) {
        const incident = await this.prisma.incident.create({
          data: {
            type: IncidentType.TEMPERATURE,
            establishmentId: equipment.establishmentId,
            equipmentId: equipment.id,
            triggerTemperatureLogId: log.id,
          },
        });

        this.logger.log(
          `Created incident ${incident.id} for out-of-range temperature ${temperatureC}°C`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to create temperature log from sopalogs measurement:`,
        error instanceof Error ? error.message : error,
      );
      // Don't throw, continue with next measurement
    }
  }
}
