import { ChannelName } from '../notification';

export interface ChannelDraft {
  title: string;
  content: string;
  recipient: string;
}

export interface OutboundMessage {
  channel: ChannelName;
  recipient: string;
  subject: string | null;
  body: string;
  html: string | null;
  data: Record<string, string> | null;
}

export interface ChannelPolicy {
  readonly channel: ChannelName;
  /** Valida y formatea. Sin I/O. Lanza ChannelRuleViolation. */
  prepare(draft: ChannelDraft): OutboundMessage;
}
