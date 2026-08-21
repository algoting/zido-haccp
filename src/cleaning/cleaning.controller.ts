import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CleaningService } from './cleaning.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateCleaningEquipmentDto } from './dto/update-equipment.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CheckTaskDto } from './dto/check-task.dto';

@Controller('cleaning')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class CleaningController {
  constructor(private cleaningService: CleaningService) {}

  // ─── SECTORS ───────────────────────────────────────

  @Get('/sectors')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async listSectors(@Request() req: any) {
    return this.cleaningService.listSectors(req.user.establishmentId);
  }

  @Post('/sectors')
  @Roles('OWNER')
  async createSector(@Request() req: any, @Body() dto: CreateSectorDto) {
    return this.cleaningService.createSector(req.user.establishmentId, dto);
  }

  @Patch('/sectors/:id')
  @Roles('OWNER')
  async updateSector(@Param('id') id: string, @Body() dto: UpdateSectorDto, @Request() req: any) {
    return this.cleaningService.updateSector(id, req.user.establishmentId, dto);
  }

  @Delete('/sectors/:id')
  @Roles('OWNER')
  async deleteSector(@Param('id') id: string, @Request() req: any) {
    return this.cleaningService.deleteSector(id, req.user.establishmentId);
  }

  // ─── EQUIPMENT & SUBSECTORS ────────────────────────

  @Post('/equipment')
  @Roles('OWNER')
  async createEquipment(@Body() dto: CreateEquipmentDto, @Request() req: any) {
    return this.cleaningService.createEquipment(req.user.establishmentId, dto);
  }

  @Post('/subsectors')
  @Roles('OWNER')
  async createSubSector(@Body() dto: CreateEquipmentDto, @Request() req: any) {
    return this.cleaningService.createEquipment(req.user.establishmentId, dto);
  }

  @Patch('/equipment/:id')
  @Roles('OWNER')
  async updateEquipment(@Param('id') id: string, @Body() dto: UpdateCleaningEquipmentDto, @Request() req: any) {
    return this.cleaningService.updateEquipment(id, req.user.establishmentId, dto);
  }

  @Patch('/subsectors/:id')
  @Roles('OWNER')
  async updateSubSector(@Param('id') id: string, @Body() dto: UpdateCleaningEquipmentDto, @Request() req: any) {
    return this.cleaningService.updateEquipment(id, req.user.establishmentId, dto);
  }

  @Delete('/equipment/:id')
  @Roles('OWNER')
  async deleteEquipment(@Param('id') id: string, @Request() req: any) {
    return this.cleaningService.deleteEquipment(id, req.user.establishmentId);
  }

  @Delete('/subsectors/:id')
  @Roles('OWNER')
  async deleteSubSector(@Param('id') id: string, @Request() req: any) {
    return this.cleaningService.deleteEquipment(id, req.user.establishmentId);
  }

  // ─── TASKS ─────────────────────────────────────────

  @Post('/tasks')
  @Roles('OWNER')
  async createTask(@Body() dto: CreateTaskDto, @Request() req: any) {
    return this.cleaningService.createTask(req.user.establishmentId, dto);
  }

  @Patch('/tasks/:id')
  @Roles('OWNER')
  async updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Request() req: any) {
    return this.cleaningService.updateTask(id, req.user.establishmentId, dto);
  }

  @Delete('/tasks/:id')
  @Roles('OWNER')
  async deleteTask(@Param('id') id: string, @Request() req: any) {
    return this.cleaningService.deleteTask(id, req.user.establishmentId);
  }

  // ─── DAILY PLAN ────────────────────────────────────

  @Get('/today')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getTodayPlan(@Request() req: any) {
    return this.cleaningService.getTodayPlan(req.user.establishmentId);
  }

  @Post('/plans/:planId/check')
  @Roles('OWNER', 'STAFF')
  async checkTask(
    @Param('planId') planId: string,
    @Body() dto: CheckTaskDto,
    @Request() req: any,
  ) {
    return this.cleaningService.checkTask(planId, dto.taskId, req.user.id, req.user.establishmentId);
  }

  @Delete('/plans/:planId/check/:taskId')
  @Roles('OWNER', 'STAFF')
  async uncheckTask(
    @Param('planId') planId: string,
    @Param('taskId') taskId: string,
    @Request() req: any,
  ) {
    return this.cleaningService.uncheckTask(planId, taskId, req.user.establishmentId);
  }

  @Post('/plans/:planId/complete')
  @Roles('OWNER', 'STAFF')
  async completePlan(@Param('planId') planId: string, @Request() req: any) {
    return this.cleaningService.completePlan(planId, req.user.establishmentId);
  }

  @Get('/history')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getHistory(@Request() req: any) {
    return this.cleaningService.getHistory(req.user.establishmentId);
  }
}
