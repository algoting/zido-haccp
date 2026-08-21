import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TempTrackingService } from './temp-tracking.service';
import { CreateTempTrackingDto } from './dto/create-temp-tracking.dto';
import { UpdateTempTrackingDto } from './dto/update-temp-tracking.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';
import type { User } from '@prisma/client';
import { TempTrackingAction } from '@prisma/client';

@Controller('temp-tracking')
@UseGuards(JwtAuthGuard, SubscriptionStateGuard)
export class TempTrackingController {
  constructor(private service: TempTrackingService) {}

  @Post()
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async create(
    @Body() dto: CreateTempTrackingDto,
    @UploadedFile() photo: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
    @CurrentUser() user: User,
  ) {
    let photoUrl: string | undefined;
    if (photo) {
      photoUrl = await this.service.uploadPhoto(
        user.establishmentId!, photo.buffer, photo.originalname, photo.mimetype,
      );
    }
    return this.service.create({
      action: dto.action as TempTrackingAction,
      productName: dto.productName,
      photoUrl,
      startTime: new Date(dto.startTime),
      startTemp: Number(dto.startTemp),
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      endTemp: dto.endTemp !== undefined ? Number(dto.endTemp) : undefined,
      establishmentId: user.establishmentId!,
      createdByUserId: user.id,
    });
  }

  @Get()
  async list(@CurrentUser() user: User) {
    return this.service.list(user.establishmentId!);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTempTrackingDto,
    @CurrentUser() user: User,
  ) {
    return this.service.update(id, user.establishmentId!, {
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      endTemp: dto.endTemp !== undefined ? Number(dto.endTemp) : undefined,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    await this.service.delete(id, user.establishmentId!);
  }
}
