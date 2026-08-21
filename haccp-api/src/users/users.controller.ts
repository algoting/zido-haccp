import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ✅ Scoped read (already done)
  @UseGuards(JwtAuthGuard)
  @Get()
  getUsers(@CurrentUser() user: any) {
    if (!user.establishmentId) return [];
    return this.usersService.findAll(user.establishmentId);
  }

  // ✅ Only OWNER can create users in their establishment
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER')
  @Post()
  createUser(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    if (!user.establishmentId) {
      throw new BadRequestException("Le propriétaire n'a pas d'établissement");
    }
    return this.usersService.createInEstablishment(dto, user.establishmentId);
  }

  @Get('ping')
  ping() {
    return { status: 'ok', module: 'users' };
  }
}
