import { Test, TestingModule } from '@nestjs/testing';

import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { PushNotificationsService } from '../notifications/push-notifications.service';

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: {} },
        { provide: PushNotificationsService, useValue: {} },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods as needed
});
