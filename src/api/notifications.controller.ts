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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

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
  NotificationPageResponse,
  NotificationResponse,
  toNotificationResponse,
} from './notification.response';
import { NonEmptyBodyPipe } from './pipes/non-empty-body.pipe';
import { NotificationIdPipe } from './pipes/notification-id.pipe';
import {
  ApiBadRequestProblem,
  ApiConflictProblem,
  ApiNotFoundProblem,
  ApiUnauthorizedProblem,
} from './problem.response';

const ID_PARAM = ApiParam({
  name: 'id',
  type: String,
  format: 'uuid',
  description: 'Id de la notificación',
});

/** Solo traduce HTTP <-> casos de uso. Los errores los mapea el filtro. */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedProblem()
export class NotificationsController {
  constructor(
    @Inject(CREATE_NOTIFICATION) private readonly create: CreateNotification,
    @Inject(LIST_MY_NOTIFICATIONS) private readonly list: ListMyNotifications,
    @Inject(GET_MY_NOTIFICATION) private readonly get: GetMyNotification,
    @Inject(REVISE_NOTIFICATION) private readonly revise: ReviseNotification,
    @Inject(DELETE_NOTIFICATION) private readonly remove: DeleteNotification,
  ) {}

  @Post()
  @ApiOperation({
    operationId: 'createNotification',
    summary: 'Crea una notificación y la envía por su canal',
    description:
      'Un payload inválido para el canal devuelve 400 y no escribe nada. Si el payload es válido pero la entrega falla, devuelve 201 con `status: failed`.',
  })
  @ApiCreatedResponse({
    description: 'Notificación creada (status `sent` o `failed`)',
    type: NotificationResponse,
  })
  @ApiBadRequestProblem()
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
  @ApiOperation({
    operationId: 'listMyNotifications',
    summary: 'Lista las notificaciones propias, más nuevas primero',
  })
  @ApiOkResponse({
    description: 'Página de notificaciones',
    type: NotificationPageResponse,
  })
  @ApiBadRequestProblem()
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
  @ID_PARAM
  @ApiOperation({
    operationId: 'getMyNotification',
    summary: 'Detalle de una notificación propia',
  })
  @ApiOkResponse({ description: 'Notificación', type: NotificationResponse })
  @ApiNotFoundProblem()
  async getOne(
    @Param('id', NotificationIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationResponse> {
    const notification = await this.get.execute({ ownerId: user.id, id });
    return toNotificationResponse(notification);
  }

  @Patch(':id')
  @ID_PARAM
  @ApiOperation({
    operationId: 'reviseNotification',
    summary: 'Edita una notificación fallida y la reenvía',
    description:
      'Solo se permite si `status` es `failed`; en cualquier otro estado devuelve 409. El canal no es editable. Tras editar, la notificación se reenvía y la respuesta trae el resultado (`sent` o `failed`).',
  })
  @ApiOkResponse({
    description: 'Notificación editada y reenviada',
    type: NotificationResponse,
  })
  @ApiBadRequestProblem()
  @ApiNotFoundProblem()
  @ApiConflictProblem()
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
  @ID_PARAM
  @ApiOperation({
    operationId: 'deleteNotification',
    summary: 'Elimina una notificación propia (en cualquier estado)',
  })
  @ApiNoContentResponse({ description: 'Eliminada, sin body' })
  @ApiNotFoundProblem()
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOne(
    @Param('id', NotificationIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.remove.execute({ ownerId: user.id, id });
  }
}
