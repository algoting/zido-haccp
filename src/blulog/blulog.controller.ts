import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { BlulogService } from './blulog.service';
import { BlulogBrokerService } from './blulog-broker.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SubscriptionStateGuard } from '../common/guards/subscription-state.guard';
import { PlanGuard } from '../common/guards/plan.guard';
import { RequirePlan } from '../common/guards/plan.decorator';
import { SubscriptionPlan } from '@prisma/client';
import { SyncBlulogRestDto, SyncBlulogBluApiDto } from './dto/sync-blulog.dto';
import { ConnectBlulogBrokerDto } from './dto/connect-broker.dto';

@Controller('blulog')
@UseGuards(JwtAuthGuard, RolesGuard, SubscriptionStateGuard, PlanGuard)
@RequirePlan(SubscriptionPlan.PRO_SUIVI)
export class BlulogController {
  constructor(
    private readonly blulogService: BlulogService,
    private readonly blulogBrokerService: BlulogBrokerService,
  ) {}

  /**
   * Sync Blulog devices via RestAPI v1.0.2 (OpenAPI / X-Access-Token)
   */
  @Post('sync-rest')
  @Roles('OWNER', 'STAFF')
  async syncRest(@Request() req: any, @Body() dto: SyncBlulogRestDto) {
    return this.blulogService.syncRestApi(
      req.user.establishmentId,
      req.user.id,
      dto,
    );
  }

  /**
   * Sync Blulog devices via BluApi v3.2.5 (XML / uname & upass)
   */
  @Post('sync-bluapi')
  @Roles('OWNER', 'STAFF')
  async syncBluApi(@Request() req: any, @Body() dto: SyncBlulogBluApiDto) {
    return this.blulogService.syncBluApi(
      req.user.establishmentId,
      req.user.id,
      dto,
    );
  }

  /**
   * Connect to Blulog RabbitMQ Broker v1.4.2.0 for real-time streaming measurements
   */
  @Post('broker/start')
  @Roles('OWNER', 'STAFF')
  async startBroker(@Request() req: any, @Body() dto: ConnectBlulogBrokerDto) {
    return this.blulogBrokerService.startBrokerConsumer(
      req.user.establishmentId,
      req.user.id,
      dto,
    );
  }

  /**
   * Stop active Blulog RabbitMQ Broker listener
   */
  @Post('broker/stop')
  @Roles('OWNER', 'STAFF')
  async stopBroker(@Request() req: any, @Body() dto: { organization: string }) {
    const connectionKey = `${req.user.establishmentId}_${dto.organization}`;
    await this.blulogBrokerService.stopBrokerConsumer(connectionKey);
    return {
      success: true,
      message: `Écouteur RabbitMQ Blulog arrêté pour l'organisation "${dto.organization}"`,
    };
  }

  /**
   * Test connection & inspect devices via RestAPI v1.0.2 without saving
   */
  @Post('test-rest')
  @Roles('OWNER', 'STAFF')
  async testRest(@Body() dto: SyncBlulogRestDto) {
    const measurements = await this.blulogService.fetchRestApiDevices(dto.accessToken);
    return {
      success: true,
      count: measurements.length,
      measurements,
    };
  }

  /**
   * Test connection & inspect devices via BluApi v3.2.5 without saving
   */
  @Post('test-bluapi')
  @Roles('OWNER', 'STAFF')
  async testBluApi(@Body() dto: SyncBlulogBluApiDto) {
    const measurements = await this.blulogService.fetchBluApiDevices(dto);
    return {
      success: true,
      count: measurements.length,
      measurements,
    };
  }
}
