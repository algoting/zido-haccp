import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { DlcService } from './dlc.service';
import { LabelService } from './label.service';
import { CreateInternalPreparationDto } from './dto/create-internal-preparation.dto';
import { UpdateInternalPreparationDto } from './dto/update-internal-preparation.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { User } from '@prisma/client';
import { UserRole, BatchStatus } from '@prisma/client';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';

@Controller('dlc')
@UseGuards(JwtAuthGuard, SubscriptionStateGuard)
export class DlcController {
  constructor(
    private dlcService: DlcService,
    private labelService: LabelService,
  ) {}

  // ============================================
  // INTERNAL PREPARATIONS (Owner only)
  // ============================================

  @Post('preparations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  async createInternalPreparation(
    @Body() dto: CreateInternalPreparationDto,
    @CurrentUser() user: User,
  ) {
    return this.dlcService.createInternalPreparation({
      ...dto,
      establishmentId: user.establishmentId!,
      createdByUserId: user.id,
    });
  }

  @Get('preparations')
  async listInternalPreparations(@CurrentUser() user: User) {
    return this.dlcService.listInternalPreparations(user.establishmentId!);
  }

  @Get('preparations/:id')
  async getInternalPreparation(@Param('id') id: string, @CurrentUser() user: User) {
    return this.dlcService.getInternalPreparation(id, user.establishmentId!);
  }

  @Put('preparations/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  async updateInternalPreparation(
    @Param('id') id: string,
    @Body() dto: UpdateInternalPreparationDto,
    @CurrentUser() user: User,
  ) {
    return this.dlcService.updateInternalPreparation(id, user.establishmentId!, dto);
  }

  @Delete('preparations/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInternalPreparation(@Param('id') id: string, @CurrentUser() user: User) {
    await this.dlcService.deleteInternalPreparation(id, user.establishmentId!);
  }

  // ============================================
  // PREPARATION BATCHES (All staff)
  // ============================================

  @Post('batches')
  async createBatch(
    @Body() dto: CreateBatchDto,
    @CurrentUser() user: User,
  ) {
    return this.dlcService.createBatch({
      ...dto,
      productionDateTime: new Date(dto.productionDateTime),
      establishmentId: user.establishmentId!,
      createdByUserId: user.id,
    });
  }

  @Post('recipes')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async createRecipe(
    @Body() dto: CreateRecipeDto,
    @UploadedFile() photo: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @CurrentUser() user: User,
  ) {
    let photoUrl: string | undefined;
    if (photo) {
      photoUrl = await this.dlcService.uploadRecipePhoto(
        user.establishmentId!,
        photo.buffer,
        photo.originalname,
        photo.mimetype,
      );
    }
    return this.dlcService.createRecipe({
      ...dto,
      photoUrl,
      establishmentId: user.establishmentId!,
      createdByUserId: user.id,
    });
  }

  @Get('batches')
  async listBatches(
    @CurrentUser() user: User,
    @Query('status') status?: BatchStatus,
    @Query('internalPreparationId') internalPreparationId?: string,
  ) {
    return this.dlcService.listBatches(user.establishmentId!, {
      status,
      internalPreparationId,
    });
  }

  @Get('batches/:id')
  async getBatch(@Param('id') id: string, @CurrentUser() user: User) {
    return this.dlcService.getBatch(id, user.establishmentId!);
  }

  @Get('batches/by-batch-id/:batchId')
  async getBatchByBatchId(@Param('batchId') batchId: string, @CurrentUser() user: User) {
    return this.dlcService.getBatchByBatchId(batchId, user.establishmentId!);
  }

  @Post('batches/:id/destroy')
  async destroyBatch(@Param('id') id: string, @CurrentUser() user: User) {
    return this.dlcService.destroyBatch(id, user.establishmentId!, user.id);
  }

  @Post('batches/update-statuses')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateBatchStatuses(@CurrentUser() user: User) {
    await this.dlcService.updateBatchStatuses(user.establishmentId!);
  }

  // ============================================
  // LABEL & QR CODE GENERATION
  // ============================================

  @Get('batches/:id/qr-code')
  async getQRCode(@Param('id') id: string, @Res() res: Response, @CurrentUser() user: User) {
    const batch = await this.dlcService.getBatch(id, user.establishmentId!);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const qrDataUrl = await this.labelService.generateQRCode(
      batch.batchId,
      frontendUrl,
    );

    // Return QR code as PNG image
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-${batch.batchId}.png"`);
    res.send(imgBuffer);
  }

  @Get('batches/:id/label')
  async getLabel(@Param('id') id: string, @Res() res: Response, @CurrentUser() user: User) {
    const batch = await this.dlcService.getBatch(id, user.establishmentId!);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const pdfBuffer = await this.labelService.generateLabelPDF(
      batch as any,
      frontendUrl,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="label-${batch.batchId}.pdf"`,
    );
    res.send(pdfBuffer);
  }
}
