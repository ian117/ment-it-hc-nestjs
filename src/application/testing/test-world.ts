import { ChannelPolicyRegistry } from '../../domain/channels/channel-policy-registry';
import { EmailPolicy } from '../../domain/channels/email.policy';
import { PushPolicy } from '../../domain/channels/push.policy';
import { SmsPolicy } from '../../domain/channels/sms.policy';
import { ChannelGatewayRegistry } from '../channel-gateway-registry';
import { DeliverNotification } from '../deliver-notification';
import { CreateNotification } from '../use-cases/create-notification';
import { DeleteNotification } from '../use-cases/delete-notification';
import { GetMyNotification } from '../use-cases/get-my-notification';
import { ListMyNotifications } from '../use-cases/list-my-notifications';
import { ReviseNotification } from '../use-cases/revise-notification';
import { EventLog } from './event-log';
import { FakeChannelGateway } from './fake-channel-gateway';
import { FakeClock } from './fake-clock';
import { InMemoryNotificationRepository } from './in-memory-notification.repository';
import { SequentialIdGenerator } from './sequential-id-generator';

export const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const OTHER_OWNER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const VALID_PHONE = '+5219611234567';

/** Cablea los casos de uso con fakes en memoria (sin framework). */
export function buildWorld() {
  const log = new EventLog();
  const clock = new FakeClock();
  const repo = new InMemoryNotificationRepository(log);
  const ids = new SequentialIdGenerator();
  const gatewayOptions = { repo, log, clock };
  const sms = new FakeChannelGateway('sms', gatewayOptions);
  const email = new FakeChannelGateway('email', gatewayOptions);
  const push = new FakeChannelGateway('push', gatewayOptions);
  const gateways = new ChannelGatewayRegistry([sms, email, push]);
  const policies = new ChannelPolicyRegistry([
    new SmsPolicy(),
    new EmailPolicy(),
    new PushPolicy(),
  ]);
  const deliver = new DeliverNotification(repo, gateways);
  return {
    log,
    clock,
    repo,
    ids,
    gateways: { sms, email, push },
    create: new CreateNotification(policies, gateways, ids, clock, deliver),
    list: new ListMyNotifications(repo),
    get: new GetMyNotification(repo),
    revise: new ReviseNotification(repo, policies, clock, deliver),
    remove: new DeleteNotification(repo),
  };
}

export type TestWorld = ReturnType<typeof buildWorld>;
