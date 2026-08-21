import { Test, TestingModule } from '@nestjs/testing';

import { TemperatureLogsController } from './temperature-logs.controller';
import { TemperatureLogsService } from './temperature-logs.service';

describe('TemperatureLogsController', () => {
  let controller: TemperatureLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemperatureLogsController],
      providers: [{ provide: TemperatureLogsService, useValue: {} }],
    }).compile();

    controller = module.get<TemperatureLogsController>(
      TemperatureLogsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
