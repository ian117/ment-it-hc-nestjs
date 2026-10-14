import { UnknownChannel } from '../domain/errors';
import { ChannelGatewayRegistry } from './channel-gateway-registry';
import { FakeChannelGateway } from './testing/fake-channel-gateway';

describe('ChannelGatewayRegistry', () => {
  it('devuelve el gateway registrado', () => {
    const sms = new FakeChannelGateway('sms');
    const registry = new ChannelGatewayRegistry([sms]);
    expect(registry.gateway('sms')).toBe(sms);
    expect(registry.has('sms')).toBe(true);
  });

  it('lanza UnknownChannel para un canal no registrado', () => {
    const registry = new ChannelGatewayRegistry([]);
    expect(registry.has('fax')).toBe(false);
    expect(() => registry.gateway('fax')).toThrow(UnknownChannel);
  });

  it('rechaza gateways duplicados', () => {
    expect(
      () =>
        new ChannelGatewayRegistry([
          new FakeChannelGateway('sms'),
          new FakeChannelGateway('sms'),
        ]),
    ).toThrow(Error);
  });
});
