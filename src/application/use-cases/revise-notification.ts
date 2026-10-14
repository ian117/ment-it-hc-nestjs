import { ChannelPolicyRegistry } from '../../domain/channels/channel-policy-registry';
import { NotificationNotFound } from '../../domain/errors';
import { Notification } from '../../domain/notification';
import { DeliverNotification } from '../deliver-notification';
import { Clock } from '../ports/clock';
import { NotificationRepository } from '../ports/notification.repository';

export interface ReviseNotificationInput {
  ownerId: string;
  id: string;
  title?: string;
  content?: string;
  recipient?: string;
}

export class ReviseNotification {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly policies: ChannelPolicyRegistry,
    private readonly clock: Clock,
    private readonly deliver: DeliverNotification,
  ) {}

  async execute(input: ReviseNotificationInput): Promise<Notification> {
    // Precedencia (ADR-011): 404 -> 409 -> 400.
    const notification = await this.notifications.findById(
      input.id,
      input.ownerId,
    );
    if (!notification) throw new NotificationNotFound(input.id);

    notification.ensureEditable();

    const changes = {
      title: input.title,
      content: input.content,
      recipient: input.recipient,
    };
    // Valida con los datos fusionados, antes de mutar y de guardar.
    const message = this.policies.policy(notification.channel).prepare({
      title: changes.title ?? notification.title,
      content: changes.content ?? notification.content,
      recipient: changes.recipient ?? notification.recipient,
    });

    notification.revise(changes, this.clock.now());
    return this.deliver.run(notification, message);
  }
}
