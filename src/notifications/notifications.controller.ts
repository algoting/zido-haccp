import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushNotificationsService } from './push-notifications.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly pushNotifications: PushNotificationsService,
  ) {}

  @Get('in-app')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.AUDITOR)
  list(@CurrentUser() user: User) {
    return this.notifications.listInApp(user);
  }

  @Get('history')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.AUDITOR)
  history(@CurrentUser() user: User) {
    return this.notifications.listAllInApp(user);
  }

  @Post(':id/mark-read')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.AUDITOR)
  markRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notifications.markRead(user, id);
  }

  @Post('/register-push-token')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.AUDITOR)
  async registerPushToken(
    @CurrentUser() user: User,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.pushNotifications.registerPushToken(
      user.id,
      dto.expoPushToken,
    );
  }

  @Post('/test-push')
  @Roles(UserRole.OWNER, UserRole.STAFF, UserRole.AUDITOR)
  async testPush(@CurrentUser() user: User) {
    return this.pushNotifications.sendPushToUser(
      user.id,
      'Test Notification',
      'This is a test push from HACCP API',
    );
  }
}
