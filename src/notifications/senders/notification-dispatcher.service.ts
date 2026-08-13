import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  NotificationDraft,
  NotificationSenderInterface,
} from './notification-sender.interface';
import {
  Notification,
  NotificationChannelEnum,
} from '../../entities/notification.entity';
import { NOTIFICATION_SENDERS } from './notification-sender.token';

@Injectable()
export class NotificationDispatcherService {
  private readonly sendersMap: Map<
    NotificationChannelEnum,
    NotificationSenderInterface
  >;

  constructor(
    @Inject(NOTIFICATION_SENDERS) senders: NotificationSenderInterface[],
  ) {
    this.sendersMap = new Map(
      senders.map((sender) => [sender.channel, sender]),
    );
  }

  /**
   * Valida la notificacion contra las reglas de su canal ANTES de persistirla.
   *
   * No hay switch(channel) aca: el canal aporta su propio DTO de payload y sus
   * propias reglas, y este metodo solo los aplica. Sumar un canal nuevo no
   * toca esta clase.
   */
  async validateDraft(draft: NotificationDraft): Promise<void> {
    const sender = this.resolveSender(draft.channel);

    if (sender.payloadDto) {
      const payload = plainToInstance(sender.payloadDto, draft.metadata ?? {});
      const errors = await validate(payload);

      if (errors.length > 0) {
        throw new BadRequestException(
          errors.flatMap((error) => Object.values(error.constraints ?? {})),
        );
      }
    }

    sender.validateDraft(draft);
  }

  async dispatch(notification: Notification): Promise<void> {
    await this.resolveSender(notification.channel).send(notification);
  }

  private resolveSender(
    channel: NotificationChannelEnum,
  ): NotificationSenderInterface {
    const sender = this.sendersMap.get(channel);
    if (!sender) {
      // No es culpa del cliente: el enum acepta el canal pero nadie lo registro.
      throw new InternalServerErrorException(
        `No sender registered for channel: ${channel}`,
      );
    }
    return sender;
  }
}
