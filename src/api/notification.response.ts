import { Notification } from '../domain/notification';

/** Forma JSON (camelCase) de `Notification` en el contrato. Sin userId. */
export interface NotificationResponse {
  id: string;
  title: string;
  content: string;
  channel: string;
  payload: { recipient: string };
  status: string;
  attempts: number;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toNotificationResponse(n: Notification): NotificationResponse {
  return {
    id: n.id,
    title: n.title,
    content: n.content,
    channel: n.channel,
    payload: { recipient: n.recipient },
    status: n.status,
    attempts: n.attempts,
    errorMessage: n.errorMessage,
    sentAt: n.sentAt ? n.sentAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}
