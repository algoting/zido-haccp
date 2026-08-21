import { Test, TestingModule } from '@nestjs/testing';
import { PmsService } from './pms.service';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../exports/gcs.service';
import { LocalFileService } from '../exports/local-file.service';
import { ConfigService } from '@nestjs/config';

describe('PmsService', () => {
  let service: PmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PmsService,
        { provide: PrismaService, useValue: {} },
        { provide: GcsService, useValue: {} },
        { provide: LocalFileService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<PmsService>(PmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods as needed
});
