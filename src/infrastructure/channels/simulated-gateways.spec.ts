import { Logger } from '@nestjs/common';

import { OutboundMessage } from '../../domain/channels/channel-policy';
import { Clock } from '../../application/ports/clock';
import { createSimulatedGateways } from './simulated-gateways';

const AT = new Date('2026-03-04T05:06:07.000Z');
const clock: Clock = { now: () => AT };

function msg(channel: string, recipient: string): OutboundMessage {
  return {
    channel,
    recipient,
    subject: null,
    body: 'x',
    html: null,
    data: null,
  };
}

describe('gateways simulados', () => {
  const gateways = new Map(
    createSimulatedGateways(clock).map((g) => [g.channel, g]),
  );

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('registra email, sms y push', () => {
    expect([...gateways.keys()].sort()).toEqual(['email', 'push', 'sms']);
  });

  it.each([
    ['email', 'FAIL@x.com'],
    ['email', 'user.fail@x.com'],
    ['push', 'tok-Fail-1'],
    ['sms', '+5219610000000'],
  ])('%s falla con %s', async (channel, recipient) => {
    const result = await gateways
      .get(channel)!
      .deliver(msg(channel, recipient));
    expect(result).toEqual({
      ok: false,
      at: AT,
      detail: 'Simulated delivery failure',
    });
  });

  it.each([
    ['email', 'ok@x.com'],
    ['push', 'device-token-1'],
    ['sms', '+5219611234567'],
    ['sms', '+52fail'],
  ])('%s entrega con %s', async (channel, recipient) => {
    const result = await gateways
      .get(channel)!
      .deliver(msg(channel, recipient));
    expect(result.ok).toBe(true);
    expect(result.at).toEqual(AT);
  });

  it('registra cada entrega en el log', async () => {
    const log = jest.spyOn(Logger.prototype, 'log');
    await gateways.get('email')!.deliver(msg('email', 'ok@x.com'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('channel=email'));
  });
});
