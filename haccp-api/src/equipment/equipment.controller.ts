import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { CreateEquipmentSectorDto } from './dto/create-equipment-sector.dto';
import { UpdateEquipmentSectorDto } from './dto/update-equipment-sector.dto';
import { AssignSectorDto } from './dto/assign-sector.dto';
import { ConnectSopalogDto } from './dto/connect-sopalog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';

@Controller('equipment')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Post()
  @Roles(UserRole.OWNER)
  create(@CurrentUser() user: User, @Body() dto: CreateEquipmentDto) {
    return this.equipmentService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.equipmentService.findAll(user);
  }

  @Get('today-status')
  getTodayStatus(@CurrentUser() user: User) {
    return this.equipmentService.getTodayStatus(user.establishmentId!);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER)
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    return this.equipmentService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.equipmentService.delete(user, id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.OWNER)
  deactivate(@CurrentUser() user: User, @Param('id') id: string) {
    return this.equipmentService.deactivate(user, id);
  }

  // ─── SECTORS ─────────────────────────────────────────

  @Get('sectors')
  listSectors(@CurrentUser() user: User) {
    return this.equipmentService.listSectors(user.establishmentId!);
  }

  @Post('sectors')
  @Roles(UserRole.OWNER)
  createSector(@CurrentUser() user: User, @Body() dto: CreateEquipmentSectorDto) {
    return this.equipmentService.createSector(user.establishmentId!, dto);
  }

  @Patch('sectors/:id')
  @Roles(UserRole.OWNER)
  updateSector(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateEquipmentSectorDto) {
    return this.equipmentService.updateSector(id, user.establishmentId!, dto);
  }

  @Delete('sectors/:id')
  @Roles(UserRole.OWNER)
  deleteSector(@CurrentUser() user: User, @Param('id') id: string) {
    return this.equipmentService.deleteSector(id, user.establishmentId!);
  }

  @Patch(':id/sector')
  @Roles(UserRole.OWNER)
  assignToSector(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: AssignSectorDto) {
    return this.equipmentService.assignEquipmentToSector(id, user.establishmentId!, dto.sectorId);
  }

  // ─── SOPALOGS INTEGRATION ────────────────────────────────────

  @Post(':id/sopalog/connect')
  @Roles(UserRole.OWNER)
  connectSopalog(
    @CurrentUser() user: User,
    @Param('id') equipmentId: string,
    @Body() dto: ConnectSopalogDto,
  ) {
    return this.equipmentService.connectSopalog(user, equipmentId, dto);
  }

  @Delete(':id/sopalog/disconnect')
  @Roles(UserRole.OWNER)
  disconnectSopalog(@CurrentUser() user: User, @Param('id') equipmentId: string) {
    return this.equipmentService.disconnectSopalog(user, equipmentId);
  }

  @Get(':id/sopalog/status')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.AUDITOR)
  getSopalogStatus(@CurrentUser() user: User, @Param('id') equipmentId: string) {
    return this.equipmentService.getSopalogStatus(user, equipmentId);
  }
}
