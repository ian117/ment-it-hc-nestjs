import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationService } from './notification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from 'src/entities/notification.entity';
import { NotificationDispatcherService } from './senders/notification-dispatcher.service';
import { EmailNotificationSender } from './senders/email-sender.service';
import { SmsNotificationSender } from './senders/sms-sender.service';
import { PushNotificationSender } from './senders/push-sender.service';
import { NOTIFICATION_SENDERS } from './senders/notification-sender.token';
import { NOTIFICATION_SERVICE } from './notification-service.token';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [
    // El modulo es el UNICO lugar que conoce la clase concreta. El controller
    // pide NOTIFICATION_SERVICE y recibe lo que aca se decida atarle.
    { provide: NOTIFICATION_SERVICE, useClass: NotificationService },
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
      inject: [
        EmailNotificationSender,
        SmsNotificationSender,
        PushNotificationSender,
      ],
    },
  ],
})
export class NotificationsModule {}
