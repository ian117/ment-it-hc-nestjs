import { ChannelPolicyRegistry } from '../../domain/channels/channel-policy-registry';
import { Notification } from '../../domain/notification';
import { ChannelGatewayRegistry } from '../channel-gateway-registry';
import { DeliverNotification } from '../deliver-notification';
import { Clock } from '../ports/clock';
import { IdGenerator } from '../ports/id-generator';

export interface CreateNotificationInput {
  ownerId: string;
  title: string;
  content: string;
  channel: string;
  recipient: string;
}

export class CreateNotification {
  constructor(
    private readonly policies: ChannelPolicyRegistry,
    private readonly gateways: ChannelGatewayRegistry,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly deliver: DeliverNotification,
  ) {}

  async execute(input: CreateNotificationInput): Promise<Notification> {
    const policy = this.policies.policy(input.channel); // UnknownChannel
    this.gateways.gateway(input.channel); // UnknownChannel
    const message = policy.prepare({
      title: input.title,
      content: input.content,
      recipient: input.recipient,
    }); // ChannelRuleViolation, sin escribir nada

    const notification = Notification.create({
      id: this.ids.newId(),
      ownerId: input.ownerId,
      title: input.title,
      content: input.content,
      channel: input.channel,
      recipient: input.recipient,
      now: this.clock.now(),
    });
    return this.deliver.run(notification, message);
  }
}
