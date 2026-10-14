import { Notification } from '../domain/notification';
import { toNotificationResponse } from './notification.response';

describe('toNotificationResponse', () => {
  const at = new Date('2026-05-06T07:08:09.000Z');
  const n = Notification.create({
    id: 'id-1',
    ownerId: 'owner-1',
    title: 'T',
    content: 'C',
    channel: 'push',
    recipient: 'tok',
    now: at,
  });

  it('pendiente: nulos presentes como null y sin userId', () => {
    expect(toNotificationResponse(n)).toEqual({
      id: 'id-1',
      title: 'T',
      content: 'C',
      channel: 'push',
      payload: { recipient: 'tok' },
      status: 'pending',
      attempts: 0,
      errorMessage: null,
      sentAt: null,
      createdAt: '2026-05-06T07:08:09.000Z',
      updatedAt: '2026-05-06T07:08:09.000Z',
    });
  });

  it('enviada: sentAt en ISO 8601 UTC', () => {
    const sent = Notification.restore({
      id: 'id-2',
      ownerId: 'o',
      title: 'T',
      content: 'C',
      channel: 'email',
      recipient: 'a@b.co',
      status: 'sent',
      attempts: 1,
      errorMessage: null,
      sentAt: at,
      createdAt: at,
      updatedAt: at,
    });
    const json = toNotificationResponse(sent);
    expect(json.sentAt).toBe('2026-05-06T07:08:09.000Z');
    expect(json).not.toHaveProperty('ownerId');
    expect(json).not.toHaveProperty('userId');
  });
});
