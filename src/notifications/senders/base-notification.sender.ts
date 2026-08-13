import { Logger } from '@nestjs/common';
import {
  Notification,
  NotificationChannelEnum,
} from '../../entities/notification.entity';
import { NotificationSenderInterface } from './notification-sender.interface';

/**
 * Template Method para los canales de envio.
 *
 * `implements NotificationSenderInterface` declara QUE cumple esta clase;
 * `extends BaseNotificationSender` en las subclases comparte COMO lo cumple.
 *
 * send() a proposito NO es abstracto: es la invariante del contrato. Todo
 * canal resuelve destinatario -> arma payload -> entrega -> registra, en ese
 * orden. Si send() fuera abstracto, una subclase podria registrar antes de
 * validar y romper LSP sin romper la compilacion. Los pasos son los abstractos,
 * el orden no se negocia.
 */
export abstract class BaseNotificationSender implements NotificationSenderInterface {
  abstract readonly channel: NotificationChannelEnum;

  protected readonly logger = new Logger(this.constructor.name);

  /** Template Method. Fija el orden de los pasos; no se sobrescribe. */
  async send(notification: Notification): Promise<void> {
    const recipient = this.resolveRecipient(notification);
    const payload = this.buildPayload(notification);

    await this.deliver(recipient, payload);

    this.register(recipient, payload);
  }

  /**
   * Paso obligatorio: de donde sale el destinatario de este canal y que lo
   * hace valido. Tira BadRequestException si el dato no sirve.
   */
  protected abstract resolveRecipient(notification: Notification): string;

  /** Paso obligatorio: la forma que este canal le da al mensaje. */
  protected abstract buildPayload(notification: Notification): unknown;

  /**
   * Hook opcional: aca es donde iria la llamada real al proveedor
   * (SendGrid, Twilio, FCM). El challenge pide simular el envio, asi que
   * el default es un no-op y ninguna subclase necesita sobrescribirlo hoy.
   *
   * Es la diferencia entre un metodo abstracto (obligatorio) y un hook
   * (opcional con default) dentro del mismo patron.
   */
  protected deliver(_recipient: string, _payload: unknown): Promise<void> {
    return Promise.resolve();
  }

  /** Paso comun: antes estaba triplicado como console.log en cada sender. */
  protected register(recipient: string, payload: unknown): void {
    this.logger.log(
      `channel=${this.channel} to=${recipient} at=${new Date().toISOString()} payload=${JSON.stringify(payload)}`,
    );
  }
}
