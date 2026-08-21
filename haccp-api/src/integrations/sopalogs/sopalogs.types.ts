/**
 * Sopalogs RabbitMQ Message Types
 * Sopalogs uses RabbitMQ for real-time message delivery
 */

export interface SopalogMeasurement {
  deviceId: string | number;
  temperature: number;
  humidity?: number;
  timestamp: string | Date;
  status?: 'OK' | 'ALERT' | 'ERROR';
  [key: string]: unknown;
}

export interface SopalogDevice {
  id: string | number;
  name: string;
  type: string;
  status: string;
  lastReading?: SopalogMeasurement;
  [key: string]: unknown;
}

export interface SopalogRabbitMQConfig {
  username: string;
  password: string;
  host: string;
  port: number;
  vhost: string;
  measurementsExchange: string;
  measurementsQueue: string;
  hubsExchange: string;
  hubsQueue: string;
  hubsGpsExchange: string;
  hubsGpsQueue: string;
}

export interface SopalogMessage {
  type: 'measurement' | 'hub' | 'hub-gps';
  payload: unknown;
  timestamp: Date;
}

/**
 * Expected Sopalogs measurement message format
 * Adjust based on actual sopalogs RabbitMQ message structure
 */
export interface SopalogMeasurementMessage {
  deviceId: string;
  temperature: number;
  humidity?: number;
  timestamp: string;
  [key: string]: unknown;
}

