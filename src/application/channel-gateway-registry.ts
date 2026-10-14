import { UnknownChannel } from '../domain/errors';
import { ChannelGateway } from './ports/channel-gateway';

export class ChannelGatewayRegistry {
  private readonly gateways = new Map<string, ChannelGateway>();

  constructor(gateways: ChannelGateway[]) {
    for (const gateway of gateways) {
      if (this.gateways.has(gateway.channel)) {
        throw new Error(`Duplicate channel gateway: ${gateway.channel}`);
      }
      this.gateways.set(gateway.channel, gateway);
    }
  }

  gateway(channel: string): ChannelGateway {
    const found = this.gateways.get(channel);
    if (!found) throw new UnknownChannel(channel);
    return found;
  }

  has(channel: string): boolean {
    return this.gateways.has(channel);
  }
}
