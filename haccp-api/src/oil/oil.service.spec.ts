import { Test, TestingModule } from '@nestjs/testing';

import { OilService } from './oil.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OilService', () => {
  let service: OilService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OilService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<OilService>(OilService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods as needed
});
