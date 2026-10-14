import { ChannelGateway } from '../../application/ports/channel-gateway';
import { Clock } from '../../application/ports/clock';
import { SimulatedChannelGateway } from './simulated-channel.gateway';

const containsFail = (recipient: string) =>
  recipient.toLowerCase().includes('fail');

const endsWithZeros = (recipient: string) => recipient.endsWith('0000');

export class EmailGateway extends SimulatedChannelGateway {
  constructor(clock: Clock) {
    super('email', containsFail, clock);
  }
}

export class SmsGateway extends SimulatedChannelGateway {
  constructor(clock: Clock) {
    super('sms', endsWithZeros, clock);
  }
}

export class PushGateway extends SimulatedChannelGateway {
  constructor(clock: Clock) {
    super('push', containsFail, clock);
  }
}

export function createSimulatedGateways(clock: Clock): ChannelGateway[] {
  return [
    new EmailGateway(clock),
    new SmsGateway(clock),
    new PushGateway(clock),
  ];
}
