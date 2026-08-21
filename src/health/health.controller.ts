import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return {
      status: 'ok',
      info: { app: { status: 'up' } },
      error: {},
      details: { app: { status: 'up' } },
    };
  }

  @Get('liveness')
  @HealthCheck()
  liveness() {
    return {
      status: 'ok',
      info: { liveness: { status: 'up' } },
      error: {},
      details: { liveness: { status: 'up' } },
    };
  }

  @Get('readiness')
  @HealthCheck()
  readiness() {
    // Readiness check - confirms app can handle requests
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
    ]);
  }
}
