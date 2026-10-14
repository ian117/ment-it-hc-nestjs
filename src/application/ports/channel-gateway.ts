import { OutboundMessage } from '../../domain/channels/channel-policy';

export interface DeliveryResult {
  ok: boolean;
  at: Date;
  detail?: string | null;
}

export interface ChannelGateway {
  readonly channel: string;
  deliver(message: OutboundMessage): Promise<DeliveryResult>;
}
