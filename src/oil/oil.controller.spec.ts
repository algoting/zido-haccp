import { Test, TestingModule } from '@nestjs/testing';
import { OilController } from './oil.controller';

import { OilService } from './oil.service';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';

import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AuditService } from '../audit/audit.service';

describe('OilController', () => {
  let controller: OilController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OilController],
      providers: [
        { provide: OilService, useValue: {} },
        { provide: AuditService, useValue: {} },
        { provide: SubscriptionsService, useValue: {} },
        {
          provide: SubscriptionStateGuard,
          useValue: { canActivate: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    controller = module.get<OilController>(OilController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for endpoints as needed
});
