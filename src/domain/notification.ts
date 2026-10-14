import {
  InvalidNotificationTransition,
  NotificationNotEditable,
} from './errors';

export type ChannelName = 'email' | 'sms' | 'push';

export const NotificationStatus = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
} as const;
export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];

export interface CreateNotificationProps {
  id: string;
  ownerId: string;
  title: string;
  content: string;
  channel: ChannelName;
  recipient: string;
  now: Date;
}

export interface NotificationProps {
  id: string;
  ownerId: string;
  title: string;
  content: string;
  channel: ChannelName;
  recipient: string;
  status: NotificationStatus;
  attempts: number;
  errorMessage: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationChanges {
  title?: string;
  content?: string;
  recipient?: string;
}

export class Notification {
  private constructor(private props: NotificationProps) {}

  static create(input: CreateNotificationProps): Notification {
    return new Notification({
      id: input.id,
      ownerId: input.ownerId,
      title: input.title,
      content: input.content,
      channel: input.channel,
      recipient: input.recipient,
      status: NotificationStatus.PENDING,
      attempts: 0,
      errorMessage: null,
      sentAt: null,
      createdAt: new Date(input.now),
      updatedAt: new Date(input.now),
    });
  }

  /** Reconstruye desde estado persistido, sin validar transiciones. */
  static restore(props: NotificationProps): Notification {
    return new Notification({
      ...props,
      sentAt: props.sentAt ? new Date(props.sentAt) : null,
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
    });
  }

  get id(): string {
    return this.props.id;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get title(): string {
    return this.props.title;
  }
  get content(): string {
    return this.props.content;
  }
  get channel(): ChannelName {
    return this.props.channel;
  }
  get recipient(): string {
    return this.props.recipient;
  }
  get status(): NotificationStatus {
    return this.props.status;
  }
  get attempts(): number {
    return this.props.attempts;
  }
  get errorMessage(): string | null {
    return this.props.errorMessage;
  }
  get sentAt(): Date | null {
    return this.props.sentAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  markSent(at: Date): void {
    this.assertPending('sent');
    this.props.status = NotificationStatus.SENT;
    this.props.sentAt = new Date(at);
    this.props.errorMessage = null;
    this.props.attempts += 1;
    this.props.updatedAt = new Date(at);
  }

  markFailed(reason: string, at: Date): void {
    this.assertPending('failed');
    this.props.status = NotificationStatus.FAILED;
    this.props.errorMessage = reason;
    this.props.attempts += 1;
    this.props.updatedAt = new Date(at);
  }

  revise(changes: NotificationChanges, at: Date): void {
    if (this.props.status !== NotificationStatus.FAILED) {
      throw new NotificationNotEditable();
    }
    if (changes.title !== undefined) this.props.title = changes.title;
    if (changes.content !== undefined) this.props.content = changes.content;
    if (changes.recipient !== undefined)
      this.props.recipient = changes.recipient;
    this.props.status = NotificationStatus.PENDING;
    this.props.errorMessage = null;
    this.props.updatedAt = new Date(at);
  }

  private assertPending(target: NotificationStatus): void {
    if (this.props.status !== NotificationStatus.PENDING) {
      throw new InvalidNotificationTransition(
        `Cannot transition from ${this.props.status} to ${target}`,
      );
    }
  }
}
