import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SopalogService } from './sopalogs.service';
import { TemperatureConformity, IncidentType } from '@prisma/client';
import { SopalogMeasurementMessage } from './sopalogs.types';

/**
 * Sopalogs Consumer Service
 * Listens to Sopalogs RabbitMQ measurements queue in real-time
 * Creates temperature logs immediately when measurements are received
 */
@Injectable()
export class SopalogConsumerService implements OnModuleInit {
  private readonly logger = new Logger(SopalogConsumerService.name);
  private isListening = false;

  constructor(
    private prisma: PrismaService,
    private sopalogs: SopalogService,
  ) {}

  /**
   * Start listening to sopalogs measurements on module init
   */
  async onModuleInit() {
    try {
      // Give sopalogs service time to connect
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (this.sopalogs.isConnected()) {
        await this.startListeningToMeasurements();
      } else {
        this.logger.warn(
          'Sopalogs not connected yet, will retry later',
        );
        // Retry after a delay
        setTimeout(() => this.startListeningToMeasurements(), 5000);
      }
    } catch (error) {
      this.logger.error(
        'Failed to initialize sopalogs consumer:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  /**
   * Start consuming messages from Sopalogs measurements queue
   */
  async startListeningToMeasurements(): Promise<void> {
    if (this.isListening) {
      this.logger.log('Already listening to sopalogs measurements');
      return;
    }

    try {
      this.logger.log('Starting to listen to Sopalogs measurements...');

      await this.sopalogs.subscribeMeasurements(
        (measurement: SopalogMeasurementMessage) =>
          this.handleMeasurement(measurement),
      );

      this.isListening = true;
      this.logger.log('✓ Successfully started listening to Sopalogs messages');
    } catch (error) {
      this.logger.error(
        'Failed to subscribe to sopalogs measurements:',
        error instanceof Error ? error.message : error,
      );
      // Retry after delay
      setTimeout(() => this.startListeningToMeasurements(), 10000);
    }
  }

  /**
   * Handle incoming measurement from Sopalogs RabbitMQ
   * This is called in real-time when a measurement arrives
   */
  private async handleMeasurement(
    measurement: SopalogMeasurementMessage,
  ): Promise<void> {
    try {
      this.logger.log(
        `Processing sopalogs measurement: deviceId=${measurement.deviceId}, temp=${measurement.temperature}°C`,
      );

      // Find equipment with this sopalogs device ID
      const equipment = await this.prisma.equipment.findFirst({
        where: {
          sopalogDeviceId: String(measurement.deviceId),
          status: 'ACTIVE',
        },
        include: {
          establishment: true,
        },
      });

      if (!equipment) {
        this.logger.warn(
          `No equipment found for sopalogs device ${measurement.deviceId}`,
        );
        return;
      }

      // Create temperature log
      await this.createTemperatureLogFromMeasurement(equipment, measurement);
    } catch (error) {
      this.logger.error(
        'Error handling sopalogs measurement:',
        error instanceof Error ? error.message : error,
      );
      // Don't throw - continue listening to other messages
    }
  }

  /**
   * Create a TemperatureLog from a sopalogs measurement
   * Auto-creates incidents if temperature is out of range
   */
  private async createTemperatureLogFromMeasurement(
    equipment: any,
    measurement: SopalogMeasurementMessage,
  ): Promise<void> {
    try {
      // Extract temperature
      const temperatureC = Number(measurement.temperature);
      if (isNaN(temperatureC)) {
        this.logger.warn(
          `Invalid temperature value from sopalogs: ${measurement.temperature}`,
        );
        return;
      }

      const measuredAt = new Date(measurement.timestamp);

      // Check if log already exists (avoid duplicates)
      const existingLog = await this.prisma.temperatureLog.findFirst({
        where: {
          equipmentId: equipment.id,
          measuredAt: measuredAt,
        },
      });

      if (existingLog) {
        this.logger.debug(
          `Temperature log already exists for equipment ${equipment.id}`,
        );
        return;
      }

      // Determine conformity (a null bound means that side is unconstrained)
      const conformity =
        (equipment.minTempC != null && temperatureC < equipment.minTempC) ||
        (equipment.maxTempC != null && temperatureC > equipment.maxTempC)
          ? TemperatureConformity.OUT_OF_RANGE
          : TemperatureConformity.OK;

      // Create temperature log with null recordedByUserId (automatic from sopalogs)
      const log = await this.prisma.temperatureLog.create({
        data: {
          equipmentId: equipment.id,
          establishmentId: equipment.establishmentId,
          temperatureC,
          measuredAt,
          conformity,
          recordedByUserId: null,
        },
      });

      this.logger.log(
        `✓ Created temperature log: ${equipment.name} = ${temperatureC}°C [${conformity}]`,
      );

      // If out of range, create incident
      if (conformity === TemperatureConformity.OUT_OF_RANGE) {
        try {
          const incident = await this.prisma.incident.create({
            data: {
              type: IncidentType.TEMPERATURE,
              establishmentId: equipment.establishmentId,
              equipmentId: equipment.id,
              triggerTemperatureLogId: log.id,
            },
          });

          this.logger.warn(
            `⚠ Created incident ${incident.id}: ${equipment.name} = ${temperatureC}°C (out of range!)`,
          );
        } catch (incidentError) {
          this.logger.error(
            'Error creating incident:',
            incidentError instanceof Error ? incidentError.message : incidentError,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to create temperature log:',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }
}
