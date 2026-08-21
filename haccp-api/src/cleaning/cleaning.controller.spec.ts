import { Test, TestingModule } from '@nestjs/testing';
import { CleaningController } from './cleaning.controller';

import { CleaningService } from './cleaning.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

describe('CleaningController', () => {
  let controller: CleaningController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CleaningController],
      providers: [
        { provide: CleaningService, useValue: {} },
        { provide: AuditService, useValue: {} },
        { provide: SubscriptionsService, useValue: {} },
        {
          provide: SubscriptionStateGuard,
          useValue: { canActivate: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    controller = module.get<CleaningController>(CleaningController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for endpoints as needed
});
