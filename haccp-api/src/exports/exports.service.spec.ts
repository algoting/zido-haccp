import { Test, TestingModule } from '@nestjs/testing';
import { ExportsService } from './exports.service';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from './pdf.service';
import { GcsService } from './gcs.service';
import { LocalFileService } from './local-file.service';

describe('ExportsService', () => {
  let service: ExportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportsService,
        { provide: PrismaService, useValue: {} },
        { provide: PdfService, useValue: {} },
        { provide: GcsService, useValue: {} },
        { provide: LocalFileService, useValue: {} },
      ],
    }).compile();

    service = module.get<ExportsService>(ExportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests for service methods as needed
});
