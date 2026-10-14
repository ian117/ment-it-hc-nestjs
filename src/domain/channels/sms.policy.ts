import { ChannelRuleViolation, FieldViolation } from '../errors';
import { ChannelDraft, ChannelPolicy, OutboundMessage } from './channel-policy';

const E164_PATTERN = /^\+[1-9]\d{1,14}$/;
const MAX_SMS_CODE_POINTS = 160;

export class SmsPolicy implements ChannelPolicy {
  readonly channel = 'sms';

  prepare(draft: ChannelDraft): OutboundMessage {
    const { content, recipient } = draft;
    const violations: FieldViolation[] = [];
    if (!E164_PATTERN.test(recipient)) {
      violations.push({
        field: 'payload.recipient',
        message: 'must be a phone number in E.164 format (e.g. +5219611234567)',
      });
    }
    if ([...content].length > MAX_SMS_CODE_POINTS) {
      violations.push({
        field: 'content',
        message: `must be at most ${MAX_SMS_CODE_POINTS} characters for sms`,
      });
    }
    if (violations.length > 0) throw new ChannelRuleViolation(violations);
    return {
      channel: this.channel,
      recipient,
      subject: null,
      body: content,
      html: null,
      data: null,
    };
  }
}
