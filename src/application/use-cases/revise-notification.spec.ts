import {
  ChannelRuleViolation,
  NotificationNotEditable,
  NotificationNotFound,
} from '../../domain/errors';
import { Notification } from '../../domain/notification';
import {
  buildWorld,
  OTHER_OWNER,
  OWNER,
  TestWorld,
  VALID_PHONE,
} from '../testing/test-world';

describe('ReviseNotification', () => {
  let w: TestWorld;
  beforeEach(() => {
    w = buildWorld();
  });

  const create = (
    over: Partial<{ channel: string; recipient: string; content: string }> = {},
  ) =>
    w.create.execute({
      ownerId: OWNER,
      title: 'Hola',
      content: 'Contenido',
      channel: 'sms',
      recipient: VALID_PHONE,
      ...over,
    });

  async function createFailed(
    over: Partial<{ channel: string; recipient: string; content: string }> = {},
  ) {
    w.gateways.sms.failWith('operador caído');
    const n = await create(over);
    w.gateways.sms.succeed();
    w.repo.saves.length = 0;
    w.log.events.length = 0;
    w.gateways.sms.messages.length = 0;
    return n;
  }

  it('desde failed reenvía y queda sent con attempts 2 y errorMessage limpio', async () => {
    const failed = await createFailed();
    w.clock.advance(60_000);
    const n = await w.revise.execute({
      ownerId: OWNER,
      id: failed.id,
      content: 'Nuevo contenido',
    });
    expect(n.status).toBe('sent');
    expect(n.attempts).toBe(2);
    expect(n.errorMessage).toBeNull();
    expect(n.content).toBe('Nuevo contenido');
    expect(n.sentAt).toEqual(w.clock.now());
    expect(w.gateways.sms.calls).toBe(1);
    expect(w.gateways.sms.messages[0].body).toBe('Nuevo contenido');
    expect(w.repo.stored(n.id)?.status).toBe('sent');
  });

  it('sigue el mismo orden: save pending, deliver, save final (2 saves)', async () => {
    const failed = await createFailed();
    await w.revise.execute({ ownerId: OWNER, id: failed.id, title: 'Otro' });
    expect(w.log.events).toEqual([
      'save:pending',
      'deliver:persisted=pending',
      'save:sent',
    ]);
    expect(w.repo.saves).toHaveLength(2);
  });

  it('si el reenvío vuelve a fallar queda failed con attempts 2', async () => {
    const failed = await createFailed();
    w.gateways.sms.failWith('sigue caído');
    const n = await w.revise.execute({
      ownerId: OWNER,
      id: failed.id,
      title: 'Otro',
    });
    expect(n.status).toBe('failed');
    expect(n.attempts).toBe(2);
    expect(n.errorMessage).toBe('sigue caído');
  });

  it('si el gateway lanza en el reenvío queda failed sin propagar', async () => {
    const failed = await createFailed();
    w.gateways.sms.throwWith(new Error('boom'));
    const n = await w.revise.execute({
      ownerId: OWNER,
      id: failed.id,
      title: 'Otro',
    });
    expect(n.status).toBe('failed');
    expect(n.errorMessage).toBe('boom');
  });

  it('lo no enviado conserva el valor actual', async () => {
    const failed = await createFailed();
    const n = await w.revise.execute({
      ownerId: OWNER,
      id: failed.id,
      title: 'Solo título',
    });
    expect(n.title).toBe('Solo título');
    expect(n.content).toBe('Contenido');
    expect(n.recipient).toBe(VALID_PHONE);
    expect(n.channel).toBe('sms');
  });

  it('desde sent lanza NotificationNotEditable sin entregar', async () => {
    const sent = await create();
    w.gateways.sms.messages.length = 0;
    w.repo.saves.length = 0;
    await expect(
      w.revise.execute({ ownerId: OWNER, id: sent.id, title: 'X' }),
    ).rejects.toThrow(NotificationNotEditable);
    expect(w.gateways.sms.calls).toBe(0);
    expect(w.repo.saves).toHaveLength(0);
  });

  it('desde pending lanza NotificationNotEditable sin entregar', async () => {
    await w.repo.save(
      Notification.create({
        id: '00000000-0000-4000-8000-0000000000ff',
        ownerId: OWNER,
        title: 'Hola',
        content: 'c',
        channel: 'sms',
        recipient: VALID_PHONE,
        now: w.clock.now(),
      }),
    );
    await expect(
      w.revise.execute({
        ownerId: OWNER,
        id: '00000000-0000-4000-8000-0000000000ff',
        title: 'X',
      }),
    ).rejects.toThrow(NotificationNotEditable);
    expect(w.gateways.sms.calls).toBe(0);
  });

  it('payload inválido sobre failed: ChannelRuleViolation, intacta y sin entregar', async () => {
    const failed = await createFailed();
    const before = w.repo.stored(failed.id)!;
    await expect(
      w.revise.execute({
        ownerId: OWNER,
        id: failed.id,
        recipient: 'no-es-telefono',
      }),
    ).rejects.toThrow(ChannelRuleViolation);
    expect(w.gateways.sms.calls).toBe(0);
    expect(w.repo.saves).toHaveLength(0);
    const after = w.repo.stored(failed.id)!;
    expect(after.status).toBe('failed');
    expect(after.attempts).toBe(1);
    expect(after.errorMessage).toBe('operador caído');
    expect(after.recipient).toBe(before.recipient);
    expect(after.updatedAt).toEqual(before.updatedAt);
  });

  it('valida con los datos fusionados: solo cambiar content a >160 en SMS falla', async () => {
    const failed = await createFailed();
    await expect(
      w.revise.execute({
        ownerId: OWNER,
        id: failed.id,
        content: 'x'.repeat(161),
      }),
    ).rejects.toThrow(ChannelRuleViolation);
    expect(w.gateways.sms.calls).toBe(0);
    expect(w.repo.stored(failed.id)?.content).toBe('Contenido');
  });

  it('valida el recipient existente contra el content nuevo (fusión inversa)', async () => {
    const failed = await createFailed();
    const n = await w.revise.execute({
      ownerId: OWNER,
      id: failed.id,
      content: 'x'.repeat(160),
    });
    expect(n.status).toBe('sent');
  });

  it('404: no existe', async () => {
    await expect(
      w.revise.execute({ ownerId: OWNER, id: 'no-existe', title: 'X' }),
    ).rejects.toThrow(NotificationNotFound);
  });

  it('404: ajena, aunque esté failed', async () => {
    const failed = await createFailed();
    await expect(
      w.revise.execute({ ownerId: OTHER_OWNER, id: failed.id, title: 'X' }),
    ).rejects.toThrow(NotificationNotFound);
    expect(w.gateways.sms.calls).toBe(0);
  });

  describe('precedencia 404 -> 409 -> 400', () => {
    it('inexistente con payload inválido responde 404', async () => {
      await expect(
        w.revise.execute({ ownerId: OWNER, id: 'no-existe', recipient: 'mal' }),
      ).rejects.toThrow(NotificationNotFound);
    });

    it('sent con payload inválido responde 409, no 400', async () => {
      const sent = await create();
      await expect(
        w.revise.execute({ ownerId: OWNER, id: sent.id, recipient: 'mal' }),
      ).rejects.toThrow(NotificationNotEditable);
    });

    it('failed con payload inválido responde 400', async () => {
      const failed = await createFailed();
      await expect(
        w.revise.execute({ ownerId: OWNER, id: failed.id, recipient: 'mal' }),
      ).rejects.toThrow(ChannelRuleViolation);
    });
  });
});
