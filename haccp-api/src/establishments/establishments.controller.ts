import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Param,
  Patch,
  Delete,
  ForbiddenException,
} from '@nestjs/common';

import { EstablishmentsService } from './establishments.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';
import { ResetTeamMemberPasswordDto } from './dto/reset-team-member-password.dto';

@Controller('establishments')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class EstablishmentsController {
  constructor(private readonly establishmentsService: EstablishmentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Get('repair-membership')
  repair(@CurrentUser() user: any) {
    return this.establishmentsService.repairOwnerMembership(user.sub);
  }

  @Post()
  create(@CurrentUser() user: any, @Body('name') name: string) {
    return this.establishmentsService.createForOwner(user.sub, name);
  }

  private verifyOwnership(user: any, establishmentId: string) {
    if (user.establishmentId !== establishmentId) {
      throw new ForbiddenException('Accès interdit à cet établissement');
    }
  }

  // Team Members endpoints
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Get(':id/team-members')
  getTeamMembers(@CurrentUser() user: any, @Param('id') establishmentId: string) {
    this.verifyOwnership(user, establishmentId);
    return this.establishmentsService.getTeamMembers(establishmentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Post(':id/team-members')
  addTeamMember(
    @CurrentUser() user: any,
    @Param('id') establishmentId: string,
    @Body() body: { email: string; role: 'STAFF' | 'AUDITOR' },
  ) {
    this.verifyOwnership(user, establishmentId);
    return this.establishmentsService.addTeamMember(
      establishmentId,
      body.email,
      body.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Patch(':id/team-members/:userId')
  updateTeamMember(
    @CurrentUser() user: any,
    @Param('id') establishmentId: string,
    @Param('userId') userId: string,
    @Body() body: { role: 'STAFF' | 'AUDITOR' },
  ) {
    this.verifyOwnership(user, establishmentId);
    return this.establishmentsService.updateTeamMember(
      establishmentId,
      userId,
      body.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Delete(':id/team-members/:userId')
  removeTeamMember(
    @CurrentUser() user: any,
    @Param('id') establishmentId: string,
    @Param('userId') userId: string,
  ) {
    this.verifyOwnership(user, establishmentId);
    return this.establishmentsService.removeTeamMember(establishmentId, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Post(':id/team-members/:userId/reset-password')
  resetTeamMemberPassword(
    @CurrentUser() user: any,
    @Param('id') establishmentId: string,
    @Param('userId') userId: string,
    @Body() dto: ResetTeamMemberPasswordDto,
  ) {
    this.verifyOwnership(user, establishmentId);
    return this.establishmentsService.resetTeamMemberPassword(
      establishmentId,
      userId,
      dto.newPassword,
    );
  }
}
