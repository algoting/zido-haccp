import { Test, TestingModule } from '@nestjs/testing';
import { ExportsController } from './exports.controller';

import { ExportsService } from './exports.service';
import { AuditService } from '../audit/audit.service';

describe('ExportsController', () => {
  let controller: ExportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportsController],
      providers: [
        { provide: ExportsService, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ExportsController>(ExportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests for endpoints as needed
});
