import { Notification } from '../../domain/notification';
import { NotificationMapper } from './notification.mapper';
import { NotificationOrmEntity } from './notification.orm.entity';

const NOW = new Date('2026-01-02T03:04:05.000Z');

function ormRow(): NotificationOrmEntity {
  const row = new NotificationOrmEntity();
  row.id = '11111111-1111-4111-8111-111111111111';
  row.ownerId = '22222222-2222-4222-8222-222222222222';
  row.title = 'Hola';
  row.content = 'Contenido';
  row.channel = 'sms';
  row.payload = { recipient: '+5219611234567' };
  row.status = 'failed';
  row.attempts = 2;
  row.errorMessage = 'Simulated delivery failure';
  row.sentAt = null;
  row.createdAt = NOW;
  row.updatedAt = new Date('2026-01-02T03:05:00.000Z');
  return row;
}

describe('NotificationMapper', () => {
  it('traduce la fila ORM al dominio (payload.recipient -> recipient)', () => {
    const n = NotificationMapper.toDomain(ormRow());

    expect(n).toBeInstanceOf(Notification);
    expect(n).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      ownerId: '22222222-2222-4222-8222-222222222222',
      title: 'Hola',
      content: 'Contenido',
      channel: 'sms',
      recipient: '+5219611234567',
      status: 'failed',
      attempts: 2,
      errorMessage: 'Simulated delivery failure',
      sentAt: null,
    });
    expect(n.createdAt).toEqual(NOW);
  });

  it('traduce el dominio a una fila ORM (recipient -> payload)', () => {
    const n = Notification.create({
      id: '11111111-1111-4111-8111-111111111111',
      ownerId: '22222222-2222-4222-8222-222222222222',
      title: 'Hola',
      content: 'Contenido',
      channel: 'email',
      recipient: 'a@b.co',
      now: NOW,
    });
    n.markSent(NOW);

    const row = NotificationMapper.toOrm(n);

    expect(row).toBeInstanceOf(NotificationOrmEntity);
    expect(row).toMatchObject({
      id: n.id,
      ownerId: n.ownerId,
      channel: 'email',
      payload: { recipient: 'a@b.co' },
      status: 'sent',
      attempts: 1,
      errorMessage: null,
      sentAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('ida y vuelta conserva el estado', () => {
    const original = ormRow();
    const back = NotificationMapper.toOrm(
      NotificationMapper.toDomain(original),
    );
    expect({ ...back }).toEqual({ ...original });
  });
});
