import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReceptionService } from './reception.service';
import { CreateReceptionDto } from './dto/create-reception.dto';
import { UpdateReceptionDto } from './dto/update-reception.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';
import { AuditService } from '../audit/audit.service';
import type { Request as ExpressRequest } from 'express';
import type { User } from '@prisma/client';

interface AuthenticatedRequest extends ExpressRequest {
  user: User;
}

@Controller('reception')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class ReceptionController {
  constructor(
    private readonly receptionService: ReceptionService,
    private readonly auditService: AuditService,
  ) {}

  private requireEstablishmentId(user: User): string {
    const id = user.establishmentId;
    if (!id) throw new Error('User has no establishment');
    return id;
  }

  @Get()
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const receptions = await this.receptionService.findAll(
      establishmentId,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 50,
    );
    const total = await this.receptionService.count(establishmentId);
    return { receptions, total };
  }

  @Get(':id')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const establishmentId = this.requireEstablishmentId(req.user);
    return this.receptionService.findOne(id, establishmentId);
  }

  @Post()
  @Roles('OWNER', 'STAFF')
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateReceptionDto) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const reception = await this.receptionService.create(establishmentId, req.user.id, dto);
    await this.auditService.logAction(
      establishmentId, 'RECEPTION_CREATED', 'GoodsReception', reception.id,
      null, { supplierId: reception.supplierId, category: reception.category }, req.user,
    );
    return reception;
  }

  @Post(':id/photos')
  @Roles('OWNER', 'STAFF')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async addPhoto(
    @Request() req: AuthenticatedRequest,
    @Param('id') receptionId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @Body() body: { photoUrl?: string },
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    if (!file && !body.photoUrl) {
      throw new BadRequestException('photo file or photoUrl is required');
    }
    if (file) {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
      }
    }
    if (body.photoUrl && !/^https?:\/\//i.test(body.photoUrl)) {
      throw new BadRequestException('Invalid photo URL');
    }
    const photoUrl = file
      ? await this.receptionService.uploadReceptionPhoto(
          establishmentId, file.buffer, file.originalname, file.mimetype,
        )
      : body.photoUrl;
    return this.receptionService.addPhoto(receptionId, establishmentId, photoUrl as string);
  }

  @Patch(':id')
  @Roles('OWNER', 'STAFF')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateReceptionDto,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const before = await this.receptionService.findOne(id, establishmentId);
    const reception = await this.receptionService.update(id, establishmentId, dto);
    await this.auditService.logAction(
      establishmentId, 'RECEPTION_UPDATED', 'GoodsReception', reception.id,
      { supplierId: before.supplierId, category: before.category },
      { supplierId: reception.supplierId, category: reception.category },
      req.user,
    );
    return reception;
  }

  @Delete(':id')
  @Roles('OWNER')
  async remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const reception = await this.receptionService.findOne(id, establishmentId);
    await this.receptionService.remove(id, establishmentId);
    await this.auditService.logAction(
      establishmentId, 'RECEPTION_DELETED', 'GoodsReception', id,
      { supplierId: reception.supplierId, category: reception.category }, null, req.user,
    );
    return { message: 'Reception deleted successfully' };
  }
}
