import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PmsService } from './pms.service';
import { UploadPmsDocumentDto } from './dto/upload-pms-document.dto';
import { UpdatePmsNotesDto } from './dto/update-pms-notes.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';
import { AuditService } from '../audit/audit.service';

@Controller('pms')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class PmsController {
  constructor(
    private pmsService: PmsService,
    private auditService: AuditService,
  ) {}

  @Get()
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getDocument(@Request() req: any) {
    const document = await this.pmsService.getDocument(
      req.user.establishmentId,
    );

    return document ?? null;
  }

  @Post('/upload')
  @Roles('OWNER')
  @UseGuards(SubscriptionStateGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadDocument(
    @Request() req: any,
    @UploadedFile() file: any,
    @Body() dto: UploadPmsDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier téléchargé');
    }

    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
    ];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non autorisé');
    }

    const document = await this.pmsService.uploadDocument(
      req.user.establishmentId,
      req.user.id,
      file.buffer,
      file.originalname,
      file.mimetype,
      dto.notes,
    );

    await this.auditService.logAction(
      req.user.establishmentId,
      'PMS_UPLOADED',
      'PmsDocument',
      document.id,
      null,
      document,
      req.user,
    );

    return document;
  }

  @Delete('/:documentId')
  @Roles('OWNER')
  @UseGuards(SubscriptionStateGuard)
  async deleteDocument(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    const document = await this.pmsService.getDocumentById(
      documentId,
      req.user.establishmentId,
    );
    if (!document) {
      throw new NotFoundException('PMS document not found');
    }
    const result = await this.pmsService.deleteDocument(
      documentId,
      req.user.establishmentId,
    );
    await this.auditService.logAction(
      req.user.establishmentId,
      'PMS_DELETED',
      'PmsDocument',
      document.id,
      document,
      null,
      req.user,
    );
    return result;
  }

  @Get('/:documentId/download-url')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getDownloadUrl(
    @Param('documentId') documentId: string,
    @Request() req: any,
  ) {
    return {
      downloadUrl: await this.pmsService.getDownloadUrl(
        documentId,
        req.user.establishmentId,
      ),
    };
  }

  @Patch('/:documentId/notes')
  @Roles('OWNER')
  async updateNotes(
    @Param('documentId') documentId: string,
    @Request() req: any,
    @Body() dto: UpdatePmsNotesDto,
  ) {
    return this.pmsService.updateNotes(
      documentId,
      req.user.establishmentId,
      dto.notes,
    );
  }
}
