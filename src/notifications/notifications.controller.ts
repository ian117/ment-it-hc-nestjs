import {
  Controller, Post, Get, Patch, Delete,
  Body, Param, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/user/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { CreateNotificationDto, UpdateNotificationDto } from './dto/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard) // protege TODAS las rutas del controller de una vez
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.notificationService.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationService.findOneByUser(user.id, id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNotificationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.notificationService.remove(user.id, id);
  }
}