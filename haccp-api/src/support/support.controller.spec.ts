import { Test, TestingModule } from '@nestjs/testing';
import { SupportController } from './support.controller';

import { SupportService } from './support.service';
import { AuditService } from '../audit/audit.service';

describe('SupportController', () => {
  let controller: SupportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportController],
      providers: [
        { provide: SupportService, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile();

    controller = module.get<SupportController>(SupportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for endpoints as needed
});
