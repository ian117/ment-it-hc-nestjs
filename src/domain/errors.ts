export class NotificationNotEditable extends Error {
  constructor(message = 'Only failed notifications can be edited') {
    super(message);
    this.name = 'NotificationNotEditable';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotificationNotFound extends Error {
  constructor(readonly notificationId?: string) {
    super(
      notificationId
        ? `Notification not found: ${notificationId}`
        : 'Notification not found',
    );
    this.name = 'NotificationNotFound';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidNotificationTransition extends Error {
  constructor(message = 'Invalid notification state transition') {
    super(message);
    this.name = 'InvalidNotificationTransition';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface FieldViolation {
  field: string;
  message: string;
}

export class ChannelRuleViolation extends Error {
  constructor(readonly violations: FieldViolation[]) {
    super(
      violations.length > 0
        ? violations.map((v) => `${v.field}: ${v.message}`).join('; ')
        : 'Channel rule violation',
    );
    if (violations.length === 0) {
      throw new Error('ChannelRuleViolation requires at least one violation');
    }
    this.name = 'ChannelRuleViolation';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnknownChannel extends Error {
  constructor(readonly channel: string) {
    super(`Unknown channel: ${channel}`);
    this.name = 'UnknownChannel';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidEmail extends Error {
  constructor(message = 'Invalid email address') {
    super(message);
    this.name = 'InvalidEmail';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class EmailAlreadyRegistered extends Error {
  constructor(message = 'Email already registered') {
    super(message);
    this.name = 'EmailAlreadyRegistered';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidCredentials extends Error {
  constructor(message = 'Invalid credentials') {
    super(message);
    this.name = 'InvalidCredentials';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidResetToken extends Error {
  constructor(message = 'Invalid or expired reset token') {
    super(message);
    this.name = 'InvalidResetToken';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UserNotFound extends Error {
  constructor(readonly userId?: string) {
    super(userId ? `User not found: ${userId}` : 'User not found');
    this.name = 'UserNotFound';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
