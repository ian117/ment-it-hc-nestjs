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
