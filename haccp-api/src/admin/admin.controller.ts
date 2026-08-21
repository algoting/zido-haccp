import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SubscriptionStatus } from '@prisma/client';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateSubscriptionStatusDto } from './dto/update-subscription-status.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PLATFORM_ADMIN')
export class AdminController {
  constructor(private adminService: AdminService) {}

  /**
   * Get all subscriptions
   */
  @Get('/subscriptions')
  async getAllSubscriptions(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '50',
  ) {
    return this.adminService.getAllSubscriptions(
      parseInt(skip),
      parseInt(take),
    );
  }

  /**
   * Update subscription status
   */
  @Patch('/subscriptions/:id/status')
  async updateSubscriptionStatus(
    @Param('id') subscriptionId: string,
    @Body() dto: UpdateSubscriptionStatusDto,
  ) {
    return this.adminService.updateSubscriptionStatus(
      subscriptionId,
      dto.status,
      dto.notes,
    );
  }

  /**
   * Get all owners
   */
  @Get('/owners')
  async getAllOwners(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '50',
  ) {
    return this.adminService.getAllOwners(parseInt(skip), parseInt(take));
  }

  /**
   * Get all establishments
   */
  @Get('/establishments')
  async getAllEstablishments(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '50',
  ) {
    return this.adminService.getAllEstablishments(
      parseInt(skip),
      parseInt(take),
    );
  }

  /**
   * Get establishment details
   */
  @Get('/establishments/:id')
  async getEstablishmentById(@Param('id') establishmentId: string) {
    return this.adminService.getEstablishmentById(establishmentId);
  }

  /**
   * Get all support tickets
   */
  @Get('/support-tickets')
  async getAllSupportTickets(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '50',
  ) {
    return this.adminService.getAllSupportTickets(
      parseInt(skip),
      parseInt(take),
    );
  }

  /**
   * Get support ticket details
   */
  @Get('/support-tickets/:id')
  async getSupportTicketById(@Param('id') ticketId: string) {
    return this.adminService.getSupportTicketById(ticketId);
  }

  /**
   * Update support ticket status
   */
  @Patch('/support-tickets/:id/status')
  async updateSupportTicketStatus(
    @Param('id') ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.adminService.updateSupportTicketStatus(ticketId, dto.status);
  }

  /**
   * Get all users for admin filters
   */
  @Get('/users')
  async getAllUsers(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '100',
  ) {
    return this.adminService.getAllUsers(parseInt(skip), Math.min(parseInt(take), 500));
  }

  @Patch('/users/:id/suspend')
  async toggleUserSuspended(@Param('id') userId: string) {
    return this.adminService.toggleUserSuspended(userId);
  }

  /**
   * Get audit logs
   */
  @Get('/audit-logs')
  async getAuditLogs(
    @Query('skip') skip: string = '0',
    @Query('take') take: string = '50',
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('establishmentId') establishmentId?: string,
  ) {
    return this.adminService.getAuditLogs(parseInt(skip), parseInt(take), {
      action,
      entityType,
      userId,
      establishmentId,
    });
  }

  /**
   * Get revenue metrics
   */
  @Get('/metrics/revenue')
  async getRevenueMetrics() {
    return this.adminService.getRevenueMetrics();
  }

  /**
   * Get system stats
   */
  @Get('/metrics/system')
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  /**
   * Get billing dashboard
   */
  @Get('/billing/dashboard')
  async getBillingDashboard() {
    const metrics = await this.adminService.getRevenueMetrics();
    const stats = await this.adminService.getSystemStats();

    return {
      ...metrics,
      ...stats,
    };
  }

  /**
   * Create establishment with owner and optional ACTIVE subscription
   */
  @Post('/establishments')
  async createEstablishment(@Body() dto: CreateEstablishmentDto) {
    const duration = Math.max(1, Math.min(3650, dto.durationDays ?? 365));
    const activateSubscription = dto.activateSubscription ?? true;

    return this.adminService.createEstablishment(
      dto.name,
      dto.ownerEmail,
      dto.ownerPassword,
      activateSubscription,
      duration,
    );
  }

  /**
   * Create user linked to an establishment
   */
  @Post('/users')
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(
      dto.email,
      dto.password,
      dto.role,
      dto.establishmentId,
    );
  }
}
