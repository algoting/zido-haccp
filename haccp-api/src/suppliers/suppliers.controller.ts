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
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
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

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly auditService: AuditService,
  ) {}

  private requireEstablishmentId(user: User): string {
    const id = user.establishmentId;
    if (!id) throw new BadRequestException("L'utilisateur n'est pas lié à un établissement");
    return id;
  }

  @Get()
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async findAll(@Request() req: AuthenticatedRequest) {
    const establishmentId = this.requireEstablishmentId(req.user);
    return this.suppliersService.findAll(establishmentId);
  }

  @Get(':id')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const establishmentId = this.requireEstablishmentId(req.user);
    return this.suppliersService.findOne(id, establishmentId);
  }

  @Post()
  @Roles('OWNER', 'STAFF')
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateSupplierDto) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const supplier = await this.suppliersService.create(establishmentId, dto);
    await this.auditService.logAction(
      establishmentId, 'SUPPLIER_CREATED', 'Supplier', supplier.id,
      null, { name: supplier.name }, req.user,
    );
    return supplier;
  }

  @Patch(':id')
  @Roles('OWNER', 'STAFF')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const supplier = await this.suppliersService.update(id, establishmentId, dto);
    await this.auditService.logAction(
      establishmentId, 'SUPPLIER_UPDATED', 'Supplier', supplier.id,
      null, { name: supplier.name }, req.user,
    );
    return supplier;
  }

  @Delete(':id')
  @Roles('OWNER')
  async remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const establishmentId = this.requireEstablishmentId(req.user);
    const supplier = await this.suppliersService.findOne(id, establishmentId);
    await this.suppliersService.remove(id, establishmentId);
    await this.auditService.logAction(
      establishmentId, 'SUPPLIER_DELETED', 'Supplier', id,
      { name: supplier.name }, null, req.user,
    );
    return { message: 'Supplier deleted successfully' };
  }
}
