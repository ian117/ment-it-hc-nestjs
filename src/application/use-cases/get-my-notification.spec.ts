import { NotificationNotFound } from '../../domain/errors';
import {
  buildWorld,
  OTHER_OWNER,
  OWNER,
  TestWorld,
  VALID_PHONE,
} from '../testing/test-world';

describe('GetMyNotification', () => {
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

  it('devuelve la notificación propia', async () => {
    const created = await create();
    const found = await w.get.execute({ ownerId: OWNER, id: created.id });
    expect(found.id).toBe(created.id);
    expect(found.status).toBe('sent');
  });

  it('lanza NotificationNotFound si no existe', async () => {
    await expect(
      w.get.execute({ ownerId: OWNER, id: 'no-existe' }),
    ).rejects.toThrow(NotificationNotFound);
  });

  it('una ajena es NotificationNotFound', async () => {
    const created = await create();
    await expect(
      w.get.execute({ ownerId: OTHER_OWNER, id: created.id }),
    ).rejects.toThrow(NotificationNotFound);
  });
});
