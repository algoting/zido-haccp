import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { UploadsMiddleware } from './uploads.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { EstablishmentsModule } from './establishments/establishments.module';
import { AuthModule } from './auth/auth.module';
import { EquipmentModule } from './equipment/equipment.module';
import { TemperatureLogsModule } from './temperature-logs/temperature-logs.module';
import { IncidentsModule } from './incidents/incidents.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { BillingModule } from './billing/billing.module';
import { CleaningModule } from './cleaning/cleaning.module';
import { OilModule } from './oil/oil.module';
import { SupportModule } from './support/support.module';
import { PmsModule } from './pms/pms.module';
import { ExportsModule } from './exports/exports.module';
import { JobsModule } from './jobs/jobs.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { TraceabilityModule } from './traceability/traceability.module';
import { DlcModule } from './dlc/dlc.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ReceptionModule } from './reception/reception.module';
import { TasksModule } from './tasks/tasks.module';
import { TempTrackingModule } from './temp-tracking/temp-tracking.module';
import { BlulogModule } from './blulog/blulog.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate limiting: 60 requests per minute per IP
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'HH:MM:ss Z',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie'],
          remove: true,
        },
        autoLogging: {
          ignore: (req) =>
            req.url === '/health' || req.url === '/health/liveness',
        },
      },
    }),
    HealthModule,
    PrismaModule,
    UsersModule,
    EstablishmentsModule,
    AuthModule,
    EquipmentModule,
    TemperatureLogsModule,
    IncidentsModule,
    AuditModule,
    NotificationsModule,
    DashboardModule,
    SubscriptionsModule,
    BillingModule,
    CleaningModule,
    OilModule,
    SupportModule,
    PmsModule,
    ExportsModule,
    JobsModule,
    AdminModule,
    TraceabilityModule,
    DlcModule,
    SuppliersModule,
    ReceptionModule,
    TasksModule,
    TempTrackingModule,
    BlulogModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(UploadsMiddleware).forRoutes('uploads/*');
  }
}
