import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  CREATE_NOTIFICATION,
  DELETE_NOTIFICATION,
  GET_MY_NOTIFICATION,
  LIST_MY_NOTIFICATIONS,
  REVISE_NOTIFICATION,
} from '../application/tokens';
import type { CreateNotification } from '../application/use-cases/create-notification';
import type { DeleteNotification } from '../application/use-cases/delete-notification';
import type { GetMyNotification } from '../application/use-cases/get-my-notification';
import type { ListMyNotifications } from '../application/use-cases/list-my-notifications';
import type { ReviseNotification } from '../application/use-cases/revise-notification';
import type { AuthenticatedUser } from '../auth/user/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/user/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsQuery } from './dto/list-notifications.query';
import { ReviseNotificationDto } from './dto/revise-notification.dto';
import {
  NotificationResponse,
  toNotificationResponse,
} from './notification.response';
import { NonEmptyBodyPipe } from './pipes/non-empty-body.pipe';
import { NotificationIdPipe } from './pipes/notification-id.pipe';

/** Solo traduce HTTP <-> casos de uso. Los errores los mapea el filtro. */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    @Inject(CREATE_NOTIFICATION) private readonly create: CreateNotification,
    @Inject(LIST_MY_NOTIFICATIONS) private readonly list: ListMyNotifications,
    @Inject(GET_MY_NOTIFICATION) private readonly get: GetMyNotification,
    @Inject(REVISE_NOTIFICATION) private readonly revise: ReviseNotification,
    @Inject(DELETE_NOTIFICATION) private readonly remove: DeleteNotification,
  ) {}

  @Post()
  async createOne(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationResponse> {
    const notification = await this.create.execute({
      ownerId: user.id,
      title: dto.title,
      content: dto.content,
      channel: dto.channel,
      recipient: dto.payload.recipient,
    });
    return toNotificationResponse(notification);
  }

  @Get()
  async listMine(
    @Query() query: ListNotificationsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.list.execute({
      ownerId: user.id,
      page: query.page,
      limit: query.limit,
    });
    return { ...result, data: result.data.map(toNotificationResponse) };
  }

  @Get(':id')
  async getOne(
    @Param('id', NotificationIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationResponse> {
    const notification = await this.get.execute({ ownerId: user.id, id });
    return toNotificationResponse(notification);
  }

  @Patch(':id')
  async reviseOne(
    @Param('id', NotificationIdPipe) id: string,
    @Body(new NonEmptyBodyPipe()) dto: ReviseNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationResponse> {
    const notification = await this.revise.execute({
      ownerId: user.id,
      id,
      title: dto.title,
      content: dto.content,
      recipient: dto.payload?.recipient,
    });
    return toNotificationResponse(notification);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOne(
    @Param('id', NotificationIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.remove.execute({ ownerId: user.id, id });
  }
}
