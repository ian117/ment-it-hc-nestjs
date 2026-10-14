export class NotificationNotEditable extends Error {
  constructor(message = 'Only failed notifications can be edited') {
    super(message);
    this.name = 'NotificationNotEditable';
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
