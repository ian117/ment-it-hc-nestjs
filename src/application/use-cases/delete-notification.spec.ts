import { NotificationNotFound } from '../../domain/errors';
import { Notification } from '../../domain/notification';
import {
  buildWorld,
  OTHER_OWNER,
  OWNER,
  TestWorld,
  VALID_PHONE,
} from '../testing/test-world';

describe('DeleteNotification', () => {
  let w: TestWorld;
  beforeEach(() => {
    w = buildWorld();
  });

  const create = () =>
    w.create.execute({
      ownerId: OWNER,
      title: 'Hola',
      content: 'c',
      channel: 'sms',
      recipient: VALID_PHONE,
    });

  it('borra una notificación sent', async () => {
    const n = await create();
    await w.remove.execute({ ownerId: OWNER, id: n.id });
    expect(w.repo.size).toBe(0);
  });

  it('borra una notificación failed', async () => {
    w.gateways.sms.failWith('x');
    const n = await create();
    expect(n.status).toBe('failed');
    await w.remove.execute({ ownerId: OWNER, id: n.id });
    expect(w.repo.size).toBe(0);
  });

  it('borra una notificación pending', async () => {
    // Pending huérfana (proceso caído entre ambos commits).
    const id = '00000000-0000-4000-8000-0000000000ff';
    await w.repo.save(
      Notification.create({
        id,
        ownerId: OWNER,
        title: 'Hola',
        content: 'c',
        channel: 'sms',
        recipient: VALID_PHONE,
        now: w.clock.now(),
      }),
    );
    expect(w.repo.persistedStatus(id)).toBe('pending');
    await w.remove.execute({ ownerId: OWNER, id });
    expect(w.repo.stored(id)).toBeUndefined();
  });

  it('lanza NotificationNotFound si no existe', async () => {
    await expect(
      w.remove.execute({ ownerId: OWNER, id: 'no-existe' }),
    ).rejects.toThrow(NotificationNotFound);
  });

  it('una ajena es NotificationNotFound y no se borra', async () => {
    const n = await create();
    await expect(
      w.remove.execute({ ownerId: OTHER_OWNER, id: n.id }),
    ).rejects.toThrow(NotificationNotFound);
    expect(w.repo.size).toBe(1);
  });
});
