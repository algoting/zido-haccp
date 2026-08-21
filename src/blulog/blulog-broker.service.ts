import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { BlulogService, BlulogMeasurement } from './blulog.service';
import { ConnectBlulogBrokerDto } from './dto/connect-broker.dto';

export interface BlulogFatMeasurementPayload {
  id: string;
  recordingId?: number;
  organizationId?: number;
  type: string;
  desc?: string;
  organization: string;
  min_temp: number;
  max_temp: number;
  min_warning_temp?: number;
  max_warning_temp?: number;
  min_humid?: number;
  max_humid?: number;
  measuringPeriod?: number;
  batteryLvl?: number;
  vrn?: string;
  label?: string;
  rcptUTC?: number;
  sent2qUTC?: number;
  m: Array<{
    t: number;
    h?: number;
    l?: number;
    utc: number; // UTC Epoch timestamp in milliseconds
    hub?: string;
    rssi?: number;
    archival?: boolean;
    lat?: number;
    lon?: number;
    e?: boolean;
    c?: number;
    v?: number;
  }>;
}

export interface BlulogHubStatusPayload {
  id: string;
  organization: string;
  vrn?: string;
  hardware?: string;
  firmware?: string;
  lastSeen: string;
  powerStatus?: string;
  imei?: string;
  type?: string;
  radioFrameCount?: number;
  lat?: number;
  lon?: number;
  csq?: number;
  btsBsic?: number;
  btsMcc?: number;
  btsMnc?: number;
  btsLac?: number;
  btsCid?: number;
}

@Injectable()
export class BlulogBrokerService implements OnModuleDestroy {
  private readonly logger = new Logger(BlulogBrokerService.name);
  private activeConnections: Map<string, { connection: amqp.ChannelModel; channel: amqp.Channel }> = new Map();

  constructor(private readonly blulogService: BlulogService) {}

  /**
   * Connect to Blulog RabbitMQ Broker v1.4.2.0 (AMQPS)
   * Host: rabbitmq-lb.bluconsole.com (Port 5671 AMQPS)
   * Virtual Host: blu-vhost
   * Exchange: /{organization}/measurements
   */
  async startBrokerConsumer(
    establishmentId: string,
    userId: string,
    dto: ConnectBlulogBrokerDto,
  ) {
    const host = dto.host || 'rabbitmq-lb.bluconsole.com';
    const vhost = dto.vhost || 'blu-vhost';
    const connectionKey = `${establishmentId}_${dto.organization}`;

    // Close existing connection if active
    await this.stopBrokerConsumer(connectionKey);

    const encodedUser = encodeURIComponent(dto.login);
    const encodedPass = encodeURIComponent(dto.password);
    const encodedVhost = encodeURIComponent(vhost);
    const amqpUrl = `amqps://${encodedUser}:${encodedPass}@${host}/${encodedVhost}`;

    const exchangeMeasurements = `/${dto.organization}/measurements`;

    this.logger.log(`Connecting to Blulog AMQP Broker at ${host} for org "${dto.organization}"...`);

    try {
      const connection = await amqp.connect(amqpUrl, { timeout: 10000 });
      const channel = await connection.createChannel();

      // Assert non-durable auto-delete queue for measurements
      const q = await channel.assertQueue('', { exclusive: true, autoDelete: true });
      await channel.bindQueue(q.queue, exchangeMeasurements, '');

      this.logger.log(`Subscribed to Blulog Broker queue "${q.queue}" on exchange "${exchangeMeasurements}"`);

      // Consume real-time measurement messages
      await channel.consume(q.queue, async (msg) => {
        if (!msg) return;
        try {
          const rawText = msg.content.toString('utf8');
          const payload: BlulogFatMeasurementPayload = JSON.parse(rawText);
          this.logger.log(`Received real-time Blulog measurement for logger ${payload.id} (${payload.organization})`);

          const measurements: BlulogMeasurement[] = [];

          if (Array.isArray(payload.m)) {
            for (const item of payload.m) {
              const measuredAt = typeof item.utc === 'number'
                ? new Date(item.utc > 1e11 ? item.utc : item.utc * 1000)
                : new Date();

              measurements.push({
                loggerId: payload.id,
                loggerLabel: payload.label || payload.desc || `Logeur Blulog ${payload.id}`,
                org: payload.organization,
                vrn: payload.vrn,
                type: (payload.type as any) || 'tdl',
                minTemp: payload.min_temp ?? 0,
                maxTemp: payload.max_temp ?? 8,
                temperatureC: item.t,
                humidity: item.h,
                light: item.l,
                measuredAt,
                batteryPercent: payload.batteryLvl,
                hubId: item.hub,
                rssi: item.rssi,
                rssiDbm: item.rssi !== undefined ? item.rssi * -0.5 : undefined,
                archival: item.archival ?? false,
                latitude: item.lat,
                longitude: item.lon,
              });
            }
          }

          if (measurements.length > 0) {
            await this.blulogService.syncToHaccpDatabase(
              establishmentId,
              userId,
              measurements,
              true,
            );
          }

          channel.ack(msg);
        } catch (err: any) {
          this.logger.error(`Error processing Blulog AMQP message: ${err?.message}`);
          channel.nack(msg, false, false);
        }
      });

      this.activeConnections.set(connectionKey, { connection, channel });

      return {
        success: true,
        message: `Connecté avec succès au Broker RabbitMQ Blulog v1.4.2.0 pour l'organisation "${dto.organization}"`,
        exchange: exchangeMeasurements,
        status: 'LISTENING',
      };
    } catch (error: any) {
      this.logger.error(`Failed to connect to Blulog AMQP Broker: ${error?.message}`);
      throw new Error(`Impossible de se connecter au Broker AMQP Blulog: ${error?.message}`);
    }
  }

  /**
   * Stop active AMQP Broker Consumer
   */
  async stopBrokerConsumer(connectionKey: string) {
    if (this.activeConnections.has(connectionKey)) {
      const { connection, channel } = this.activeConnections.get(connectionKey)!;
      try {
        await channel.close();
        await connection.close();
      } catch (e) {
        // ignore close errors
      }
      this.activeConnections.delete(connectionKey);
      this.logger.log(`Closed Blulog Broker connection "${connectionKey}"`);
    }
  }

  /**
   * OnModuleDestroy lifecycle hook
   */
  async onModuleDestroy() {
    for (const [key] of this.activeConnections) {
      await this.stopBrokerConsumer(key);
    }
  }
}
