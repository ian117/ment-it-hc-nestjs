import { Module } from '@nestjs/common';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationsController } from './api/notifications.controller';
import { ChannelGatewayRegistry } from './application/channel-gateway-registry';
import { DeliverNotification } from './application/deliver-notification';
import { CLOCK, type Clock } from './application/ports/clock';
import {
  ID_GENERATOR,
  type IdGenerator,
} from './application/ports/id-generator';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from './application/ports/notification.repository';
import {
  CREATE_NOTIFICATION,
  DELETE_NOTIFICATION,
  GET_MY_NOTIFICATION,
  LIST_MY_NOTIFICATIONS,
  REVISE_NOTIFICATION,
} from './application/tokens';
import { CreateNotification } from './application/use-cases/create-notification';
import { DeleteNotification } from './application/use-cases/delete-notification';
import { GetMyNotification } from './application/use-cases/get-my-notification';
import { ListMyNotifications } from './application/use-cases/list-my-notifications';
import { ReviseNotification } from './application/use-cases/revise-notification';
import { ChannelPolicyRegistry } from './domain/channels/channel-policy-registry';
import { EmailPolicy } from './domain/channels/email.policy';
import { PushPolicy } from './domain/channels/push.policy';
import { SmsPolicy } from './domain/channels/sms.policy';
import { createSimulatedGateways } from './infrastructure/channels/simulated-gateways';
import { NotificationOrmEntity } from './infrastructure/persistence/notification.orm.entity';
import { TypeOrmNotificationRepository } from './infrastructure/persistence/typeorm-notification.repository';
import { CommonModule } from './common.module';

const POLICY_REGISTRY = Symbol('ChannelPolicyRegistry');
const GATEWAY_REGISTRY = Symbol('ChannelGatewayRegistry');
const DELIVER_NOTIFICATION = Symbol('DeliverNotification');

/**
 * Raíz de composición de notificaciones: el único lugar que conoce las clases
 * concretas. Agregar un canal = su política + su gateway, registrados aquí.
 */
@Module({
  imports: [CommonModule, TypeOrmModule.forFeature([NotificationOrmEntity])],
  controllers: [NotificationsController],
  providers: [
    {
      provide: NOTIFICATION_REPOSITORY,
      useFactory: (repo: Repository<NotificationOrmEntity>) =>
        new TypeOrmNotificationRepository(repo),
      inject: [getRepositoryToken(NotificationOrmEntity)],
    },
    {
      provide: POLICY_REGISTRY,
      useFactory: () =>
        new ChannelPolicyRegistry([
          new EmailPolicy(),
          new SmsPolicy(),
          new PushPolicy(),
        ]),
    },
    {
      provide: GATEWAY_REGISTRY,
      useFactory: (clock: Clock) =>
        new ChannelGatewayRegistry(createSimulatedGateways(clock)),
      inject: [CLOCK],
    },
    {
      provide: DELIVER_NOTIFICATION,
      useFactory: (
        repo: NotificationRepository,
        gateways: ChannelGatewayRegistry,
      ) => new DeliverNotification(repo, gateways),
      inject: [NOTIFICATION_REPOSITORY, GATEWAY_REGISTRY],
    },
    {
      provide: CREATE_NOTIFICATION,
      useFactory: (
        policies: ChannelPolicyRegistry,
        gateways: ChannelGatewayRegistry,
        ids: IdGenerator,
        clock: Clock,
        deliver: DeliverNotification,
      ) => new CreateNotification(policies, gateways, ids, clock, deliver),
      inject: [
        POLICY_REGISTRY,
        GATEWAY_REGISTRY,
        ID_GENERATOR,
        CLOCK,
        DELIVER_NOTIFICATION,
      ],
    },
    {
      provide: LIST_MY_NOTIFICATIONS,
      useFactory: (repo: NotificationRepository) =>
        new ListMyNotifications(repo),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: GET_MY_NOTIFICATION,
      useFactory: (repo: NotificationRepository) => new GetMyNotification(repo),
      inject: [NOTIFICATION_REPOSITORY],
    },
    {
      provide: REVISE_NOTIFICATION,
      useFactory: (
        repo: NotificationRepository,
        policies: ChannelPolicyRegistry,
        clock: Clock,
        deliver: DeliverNotification,
      ) => new ReviseNotification(repo, policies, clock, deliver),
      inject: [
        NOTIFICATION_REPOSITORY,
        POLICY_REGISTRY,
        CLOCK,
        DELIVER_NOTIFICATION,
      ],
    },
    {
      provide: DELETE_NOTIFICATION,
      useFactory: (repo: NotificationRepository) =>
        new DeleteNotification(repo),
      inject: [NOTIFICATION_REPOSITORY],
    },
  ],
})
export class NotificationsModule {}
