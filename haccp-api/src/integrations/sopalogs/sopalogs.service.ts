import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { SopalogRabbitMQConfig } from './sopalogs.types';

/**
 * Sopalogs Integration Service
 * Handles connection to Sopalogs RabbitMQ broker for real-time temperature data
 */
@Injectable()
export class SopalogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SopalogService.name);
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;
  private config: SopalogRabbitMQConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load Sopalogs RabbitMQ configuration from environment
   */
  private loadConfig(): SopalogRabbitMQConfig {
    return {
      username: process.env.SOPALOGS_USERNAME || '',
      password: process.env.SOPALOGS_PASSWORD || '',
      host: process.env.SOPALOGS_HOST || 'rabbitmq-lb.bluconsole.com',
      port: parseInt(process.env.SOPALOGS_PORT || '5671'),
      vhost: process.env.SOPALOGS_VHOST || '/blu-vhost',
      measurementsExchange: process.env.SOPALOGS_MEASUREMENTS_EXCHANGE || '/SOPAC/ALTEA CONSEIL/measurements',
      measurementsQueue: process.env.SOPALOGS_MEASUREMENTS_QUEUE || '/SOPAC/ALTEA CONSEIL/measurements',
      hubsExchange: process.env.SOPALOGS_HUBS_EXCHANGE || '/SOPAC/ALTEA CONSEIL/hubs',
      hubsQueue: process.env.SOPALOGS_HUBS_QUEUE || '/SOPAC/ALTEA CONSEIL/hubs',
      hubsGpsExchange: process.env.SOPALOGS_HUBS_GPS_EXCHANGE || '/SOPAC/ALTEA CONSEIL/hubs-gps',
      hubsGpsQueue: process.env.SOPALOGS_HUBS_GPS_QUEUE || '/SOPAC/ALTEA CONSEIL/hubs-gps',
    };
  }

  /**
   * Initialize connection on module start
   */
  async onModuleInit() {
    try {
      await this.connect();
    } catch (error) {
      this.logger.error(
        'Failed to initialize sopalogs connection:',
        error instanceof Error ? error.message : error,
      );
      // Don't throw - allow app to start even if sopalogs is unavailable
    }
  }

  /**
   * Clean up connection on module destroy
   */
  async onModuleDestroy() {
    try {
      if (this.connection) {
        await this.connection.close();
        this.logger.log('Sopalogs RabbitMQ connection closed');
      }
    } catch (error) {
      this.logger.error(
        'Error closing sopalogs connection:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  /**
   * Connect to Sopalogs RabbitMQ broker
   */
  async connect(): Promise<void> {
    try {
      if (this.connection && this.channel) {
        this.logger.log('Sopalogs RabbitMQ already connected');
        return;
      }

      const url = this.buildConnectionUrl();
      this.logger.log(`Connecting to Sopalogs RabbitMQ at ${this.config.host}...`);

      this.connection = await amqp.connect(url, {
        connectionName: 'haccp-app',
      });

      this.channel = await this.connection.createChannel();

      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error:', err.message);
        this.connection = null;
        this.channel = null;
      });

      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
        this.connection = null;
        this.channel = null;
      });

      this.logger.log('✓ Connected to Sopalogs RabbitMQ successfully');
    } catch (error) {
      this.logger.error(
        'Failed to connect to Sopalogs RabbitMQ:',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }

  /**
   * Build RabbitMQ connection URL with credentials
   */
  private buildConnectionUrl(): string {
    return `amqps://${this.config.username}:${this.config.password}@${this.config.host}:${this.config.port}/${encodeURIComponent(this.config.vhost)}`;
  }

  /**
   * Get the channel (reconnect if needed)
   */
  private async getChannel(): Promise<amqp.Channel | amqp.ConfirmChannel> {
    if (!this.channel || !this.connection) {
      await this.connect();
    }
    return this.channel!;
  }

  /**
   * Get the connection status
   */
  isConnected(): boolean {
    return !!this.connection && !!this.channel;
  }

  /**
   * Subscribe to measurements queue
   * @param callback Function to handle each message
   */
  async subscribeMeasurements(
    callback: (message: any) => Promise<void>,
  ): Promise<void> {
    try {
      const channel = await this.getChannel();

      // Declare exchange and queue
      await channel.assertExchange(
        this.config.measurementsExchange,
        'fanout',
        { durable: true },
      );

      const queue = await channel.assertQueue(this.config.measurementsQueue, {
        durable: true,
      });

      // Bind queue to exchange
      await channel.bindQueue(
        queue.queue,
        this.config.measurementsExchange,
        '',
      );

      // Set up consumer
      await channel.consume(queue.queue, async (msg) => {
        if (msg) {
          try {
            const content = msg.content.toString();
            const measurement = JSON.parse(content);

            this.logger.debug(
              `Received measurement: ${JSON.stringify(measurement)}`,
            );

            await callback(measurement);
            channel.ack(msg);
          } catch (error) {
            this.logger.error(
              'Error processing measurement message:',
              error instanceof Error ? error.message : error,
            );
            channel.nack(msg, false, true); // Requeue on error
          }
        }
      });

      this.logger.log(
        `✓ Subscribed to measurements queue: ${this.config.measurementsQueue}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to subscribe to measurements:',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }

  /**
   * Test connection by getting connection status
   */
  async validateConnection(): Promise<boolean> {
    try {
      return this.isConnected();
    } catch (error) {
      this.logger.error(
        'Connection validation failed:',
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  }
}

