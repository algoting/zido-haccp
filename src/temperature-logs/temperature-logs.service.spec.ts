import { Test, TestingModule } from '@nestjs/testing';
import { TemperatureLogsService } from './temperature-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('TemperatureLogsService', () => {
  let service: TemperatureLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemperatureLogsService,
        { provide: PrismaService, useValue: {} },
        { provide: AuditService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();

    service = module.get<TemperatureLogsService>(TemperatureLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
