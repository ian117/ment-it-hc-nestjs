import { Type } from '@nestjs/common';
import {
  Notification,
  NotificationChannelEnum,
} from '../../entities/notification.entity';

/**
 * Lo minimo que hace falta saber de una notificacion para validarla antes de
 * persistirla. Lo cumple tanto un CreateNotificationDto como una entity ya
 * cargada, asi que sirve para el alta y para la edicion.
 */
export interface NotificationDraft {
  channel: NotificationChannelEnum;
  title: string;
  content: string;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationSenderInterface {
  readonly channel: NotificationChannelEnum;

  /**
   * DTO que describe que espera este canal dentro de `metadata`.
   * null = el canal no necesita datos extra.
   *
   * Es lo que permite validar el payload sin que nadie haga switch(channel):
   * el canal trae su propio contrato, el dispatcher solo lo aplica.
   */
  readonly payloadDto: Type<object> | null;

  /**
   * Reglas del canal que no se pueden expresar en el DTO de metadata porque
   * miran campos de la notificacion (ej: el limite de 160 caracteres del SMS
   * mira `content`, que es comun a todos los canales).
   */
  validateDraft(draft: NotificationDraft): void;

  send(notification: Notification): Promise<void>;
}
