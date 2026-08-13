import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/user/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/user/authenticated-user.interface';
import type { NotificationInterface } from './notification.interface';
import { NOTIFICATION_SERVICE } from './notification-service.token';
import {
  CreateNotificationDto,
  UpdateNotificationDto,
} from './dto/notification.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard) // protege TODAS las rutas del controller de una vez
export class NotificationsController {
  // El controller compila contra la interfaz, no contra la clase concreta.
  // Cambiar la implementacion es un cambio de una linea en el modulo, y un
  // test puede pasarle un fake sin tocar TypeORM.
  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: NotificationInterface,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crea una notificación y dispara su envío' })
  @ApiResponse({ status: 201, description: 'Notificación creada y enviada' })
  create(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtiene las Notificaciones X usuario basado en su token',
  })
  @ApiResponse({ status: 200 })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.findAllByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene los detalles de una Notificacion' })
  @ApiResponse({ status: 200 })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.findOneByUser(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita los campos disponibles de la Notificacion' })
  @ApiResponse({ status: 200 })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina la Notificacion' })
  @ApiResponse({ status: 204 })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationService.remove(user.id, id);
  }
}
