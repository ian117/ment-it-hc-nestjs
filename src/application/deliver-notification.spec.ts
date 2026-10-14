import { UnknownChannel } from '../domain/errors';
import { Notification } from '../domain/notification';
import { ChannelGatewayRegistry } from './channel-gateway-registry';
import { DeliverNotification } from './deliver-notification';
import { FakeChannelGateway } from './testing/fake-channel-gateway';
import { InMemoryNotificationRepository } from './testing/in-memory-notification.repository';

const T0 = new Date('2026-01-01T10:00:00.000Z');
const message = {
  channel: 'sms',
  recipient: '+5219611234567',
  subject: null,
  body: 'x',
  html: null,
  data: null,
};

function pending(channel = 'sms'): Notification {
  return Notification.create({
    id: '00000000-0000-4000-8000-000000000001',
    ownerId: 'o',
    title: 't',
    content: 'c',
    channel,
    recipient: '+5219611234567',
    now: T0,
  });
}

describe('DeliverNotification', () => {
  it('usa result.at como sentAt', async () => {
    const repo = new InMemoryNotificationRepository();
    const clock = { now: () => new Date('2026-02-02T00:00:00.000Z') };
    const gw = new FakeChannelGateway('sms', { clock });
    const out = await new DeliverNotification(
      repo,
      new ChannelGatewayRegistry([gw]),
    ).run(pending(), message);
    expect(out.sentAt).toEqual(clock.now());
  });

  it('canal sin gateway: UnknownChannel antes de escribir', async () => {
    const repo = new InMemoryNotificationRepository();
    const svc = new DeliverNotification(repo, new ChannelGatewayRegistry([]));
    await expect(svc.run(pending(), message)).rejects.toThrow(UnknownChannel);
    expect(repo.saves).toHaveLength(0);
  });
});
