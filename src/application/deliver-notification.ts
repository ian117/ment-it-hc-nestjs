import { OutboundMessage } from '../domain/channels/channel-policy';
import { Notification } from '../domain/notification';
import { ChannelGatewayRegistry } from './channel-gateway-registry';
import { DeliveryResult } from './ports/channel-gateway';
import { NotificationRepository } from './ports/notification.repository';

/**
 * Final compartido de Create y Revise (diseño 3.3, ADR-008/011):
 * guarda pending -> entrega (sin transacción) -> markSent/markFailed -> guarda.
 */
export class DeliverNotification {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly gateways: ChannelGatewayRegistry,
  ) {}

  async run(
    notification: Notification,
    message: OutboundMessage,
  ): Promise<Notification> {
    // UnknownChannel antes de escribir nada.
    const gateway = this.gateways.gateway(notification.channel);

    await this.notifications.save(notification);

    let result: DeliveryResult;
    try {
      result = await gateway.deliver(message);
    } catch (error) {
      // Un gateway que lanza cuenta como entrega fallida (ADR-011): la
      // notificación ya está pending y no puede quedar huérfana.
      result = {
        ok: false,
        // Sin Clock en este servicio: se reutiliza la última marca conocida.
        at: notification.updatedAt,
        detail: error instanceof Error ? error.message : String(error),
      };
    }

    if (result.ok) {
      notification.markSent(result.at);
    } else {
      notification.markFailed(result.detail ?? 'Delivery failed', result.at);
    }
    await this.notifications.save(notification);
    return notification;
  }
}
