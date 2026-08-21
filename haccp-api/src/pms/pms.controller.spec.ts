import { Test, TestingModule } from '@nestjs/testing';
import { PmsController } from './pms.controller';

import { PmsService } from './pms.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

describe('PmsController', () => {
  let controller: PmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PmsController],
      providers: [
        { provide: PmsService, useValue: {} },
        { provide: AuditService, useValue: {} },
        { provide: SubscriptionsService, useValue: {} },
        {
          provide: SubscriptionStateGuard,
          useValue: { canActivate: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    controller = module.get<PmsController>(PmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for endpoints as needed
});
