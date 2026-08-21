import { Test, TestingModule } from '@nestjs/testing';
import { CleaningService } from './cleaning.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CleaningService', () => {
  let service: CleaningService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CleaningService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<CleaningService>(CleaningService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods as needed
});
