import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { ExportsService } from './exports.service';
import { GenerateExportDto } from './dto/generate-export.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';

@Controller('exports')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class ExportsController {
  constructor(
    private exportsService: ExportsService,
    private auditService: AuditService,
  ) {}

  @Post('/generate')
  @Roles('OWNER', 'AUDITOR')
  async generateExport(
    @Request() req: any,
    @Body() dto: GenerateExportDto,
  ) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      throw new BadRequestException('Format de date invalide');
    }

    const job = await this.exportsService.createExportJob(
      req.user.establishmentId,
      periodStart,
      periodEnd,
    );

    await this.auditService.logAction(
      req.user.establishmentId,
      'EXPORT_GENERATED',
      'ExportJob',
      job.id,
      null,
      job,
      req.user,
    );

    // Trigger async processing without waiting (fire and forget)
    // Use setImmediate for better async handling than setTimeout
    setImmediate(() => {
      void this.exportsService
        .processExportJob(job.id, req.user.establishmentId)
        .catch((error) => {
          console.error(
            `Failed to process export ${job.id}:`,
            error instanceof Error ? error.message : error,
          );
        });
    });

    return job;
  }

  @Post('/:id/process')
  @Roles('PLATFORM_ADMIN')
  async processExport(@Param('id') id: string, @Request() req: any) {
    // This endpoint is called by Cloud Task (internal, admin only)
    // Get establishment ID from query param or internal tracking
    const establishmentId =
      req.query.establishmentId || req.body.establishmentId;

    if (!establishmentId) {
      throw new BadRequestException('establishmentId est requis');
    }

    const result = await this.exportsService.processExportJob(
      id,
      establishmentId,
      req,
    );
    return result;
  }

  @Get()
  @Roles('OWNER', 'AUDITOR')
  async getExports(@Request() req: any) {
    return this.exportsService.getExportJobs(req.user.establishmentId);
  }

  @Get('/:id')
  @Roles('OWNER', 'AUDITOR')
  async getExport(@Param('id') id: string, @Request() req: any) {
    return this.exportsService.getExportJob(id, req.user.establishmentId);
  }

  @Get('/:id/download')
  @Roles('OWNER', 'AUDITOR')
  async downloadExport(@Param('id') id: string, @Request() req: any) {
    const downloadUrl = await this.exportsService.getExportDownloadUrl(
      id,
      req.user.establishmentId,
    );

    return { downloadUrl };
  }
}
