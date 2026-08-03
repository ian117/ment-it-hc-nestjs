import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationService } from './notification.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationService]
})
export class NotificationsModule {}
