import { ChannelRuleViolation } from '../errors';
import { ChannelDraft, ChannelPolicy, OutboundMessage } from './channel-policy';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 320;

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export class EmailPolicy implements ChannelPolicy {
  readonly channel = 'email';

  prepare(draft: ChannelDraft): OutboundMessage {
    const { title, content, recipient } = draft;
    if (recipient.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(recipient)) {
      throw new ChannelRuleViolation([
        {
          field: 'payload.recipient',
          message: `must be a valid email address (max ${MAX_EMAIL_LENGTH} characters)`,
        },
      ]);
    }
    return {
      channel: this.channel,
      recipient,
      subject: title,
      body: content,
      html: `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(content)}</p>`,
      data: null,
    };
  }
}
