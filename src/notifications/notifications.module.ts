import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationService } from './notification.service';
import { TypeOrmModule } from 'node_modules/@nestjs/typeorm';
import { Notification } from 'src/entities/notification.entity';
import { NotificationDispatcherService } from './senders/notification-dispatcher.service';
import { EmailNotificationSender } from './senders/email-sender.service';
import { SmsNotificationSender } from './senders/sms-sender.service';
import { PushNotificationSender } from './senders/push-sender.service';
import { NOTIFICATION_SENDERS } from './senders/notification-sender.token';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [ 
    NotificationService,
    NotificationDispatcherService,
    EmailNotificationSender,
    SmsNotificationSender,
    PushNotificationSender,
     {
      provide: NOTIFICATION_SENDERS,
      useFactory: (
        email: EmailNotificationSender,
        sms: SmsNotificationSender,
        push: PushNotificationSender,
      ) => [email, sms, push],
      inject: [EmailNotificationSender, SmsNotificationSender, PushNotificationSender],
    },
  ]
})
export class NotificationsModule {}
