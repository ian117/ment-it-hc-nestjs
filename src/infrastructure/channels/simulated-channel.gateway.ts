import { Logger } from '@nestjs/common';

import { OutboundMessage } from '../../domain/channels/channel-policy';
import {
  ChannelGateway,
  DeliveryResult,
} from '../../application/ports/channel-gateway';
import { Clock } from '../../application/ports/clock';

export const SIMULATED_FAILURE_DETAIL = 'Simulated delivery failure';

/**
 * Gateway simulado y determinista (ADR-012): la regla de fallo es una
 * función del destinatario; todo lo demás entrega con éxito. Mañana se
 * reemplaza por Twilio/FCM/SendGrid sin tocar dominio ni casos de uso.
 */
export class SimulatedChannelGateway implements ChannelGateway {
  private readonly logger = new Logger(SimulatedChannelGateway.name);

  constructor(
    readonly channel: string,
    private readonly shouldFail: (recipient: string) => boolean,
    private readonly clock: Clock,
  ) {}

  deliver(message: OutboundMessage): Promise<DeliveryResult> {
    const ok = !this.shouldFail(message.recipient);
    const at = this.clock.now();
    this.logger.log(
      `channel=${this.channel} recipient=${message.recipient} result=${ok ? 'sent' : 'failed'}`,
    );
    return Promise.resolve(
      ok ? { ok, at } : { ok, at, detail: SIMULATED_FAILURE_DETAIL },
    );
  }
}
