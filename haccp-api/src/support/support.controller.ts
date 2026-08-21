import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { AddSupportMessageDto } from './dto/add-support-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';

@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class SupportController {
  constructor(
    private supportService: SupportService,
    private auditService: AuditService,
  ) {}

  @Post('/tickets')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async createTicket(
    @Request() req: any,
    @Body() dto: CreateSupportTicketDto,
  ) {
    const ticket = await this.supportService.createTicket(
      req.user.establishmentId,
      req.user.id,
      dto.category,
      dto.message,
    );

    await this.auditService.logAction(
      req.user.establishmentId,
      'SUPPORT_TICKET_CREATED',
      'SupportTicket',
      ticket.id,
      null,
      ticket,
      req.user,
    );

    return ticket;
  }

  @Get('/tickets')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getTickets(@Request() req: any) {
    return this.supportService.getTickets(req.user.establishmentId);
  }

  @Get('/tickets/:id')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async getTicket(@Param('id') id: string, @Request() req: any) {
    return this.supportService.getTicket(id, req.user.establishmentId);
  }

  @Post('/tickets/:id/messages')
  @Roles('OWNER', 'STAFF', 'AUDITOR')
  async addMessage(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: AddSupportMessageDto,
  ) {
    const message = await this.supportService.addMessage(
      id,
      req.user.establishmentId,
      req.user.id,
      dto.message,
      dto.attachmentUrl,
    );

    await this.auditService.logAction(
      req.user.establishmentId,
      'SUPPORT_MESSAGE_ADDED',
      'SupportMessage',
      message.id,
      null,
      message,
      req.user,
    );

    return message;
  }

  @Post('/tickets/:id/close')
  @Roles('OWNER')
  async closeTicket(@Param('id') id: string, @Request() req: any) {
    return this.supportService.closeTicket(id, req.user.establishmentId);
  }

  // Super Admin endpoints
  @Get('/admin/tickets')
  @Roles('PLATFORM_ADMIN')
  async getAllTickets(@Query('skip') skip = 0, @Query('take') take = 50) {
    return this.supportService.getAllTickets(skip, take);
  }

  @Get('/admin/tickets/:id')
  @Roles('PLATFORM_ADMIN')
  async getTicketBySuperAdmin(@Param('id') id: string) {
    return this.supportService.getTicketBySuperAdmin(id);
  }
}
