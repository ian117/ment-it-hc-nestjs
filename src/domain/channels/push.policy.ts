import { ChannelRuleViolation } from '../errors';
import { ChannelDraft, ChannelPolicy, OutboundMessage } from './channel-policy';

const TOKEN_PATTERN = /^[A-Za-z0-9:_.-]+$/;
const MIN_TOKEN_LENGTH = 8;
const MAX_TOKEN_LENGTH = 4096;

export class PushPolicy implements ChannelPolicy {
  readonly channel = 'push';

  prepare(draft: ChannelDraft): OutboundMessage {
    const { title, content, recipient } = draft;
    if (
      recipient.length < MIN_TOKEN_LENGTH ||
      recipient.length > MAX_TOKEN_LENGTH ||
      !TOKEN_PATTERN.test(recipient)
    ) {
      throw new ChannelRuleViolation([
        {
          field: 'payload.recipient',
          message: `must be a device token of ${MIN_TOKEN_LENGTH} to ${MAX_TOKEN_LENGTH} characters (letters, digits, ':', '_', '.', '-')`,
        },
      ]);
    }
    return {
      channel: this.channel,
      recipient,
      subject: null,
      body: content,
      html: null,
      data: { title, body: content },
    };
  }
}
