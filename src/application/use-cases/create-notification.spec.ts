import { ChannelRuleViolation, UnknownChannel } from '../../domain/errors';
import {
  buildWorld,
  OWNER,
  TestWorld,
  VALID_PHONE,
} from '../testing/test-world';

const input = {
  ownerId: OWNER,
  title: 'Hola',
  content: 'Contenido',
  channel: 'sms',
  recipient: VALID_PHONE,
};

describe('CreateNotification', () => {
  let w: TestWorld;
  beforeEach(() => {
    w = buildWorld();
  });

  it('crea y queda sent cuando el gateway entrega', async () => {
    const n = await w.create.execute(input);
    expect(n.status).toBe('sent');
    expect(n.attempts).toBe(1);
    expect(n.errorMessage).toBeNull();
    expect(n.sentAt).toEqual(w.clock.now());
    expect(n.ownerId).toBe(OWNER);
    expect(n.id).toBe('00000000-0000-4000-8000-000000000001');
    expect(w.repo.stored(n.id)?.status).toBe('sent');
  });

  it('entrega al gateway el mensaje preparado por la política', async () => {
    await w.create.execute(input);
    expect(w.gateways.sms.messages).toHaveLength(1);
    expect(w.gateways.sms.messages[0]).toMatchObject({
      channel: 'sms',
      recipient: VALID_PHONE,
      body: 'Contenido',
    });
  });

  it('queda failed con el detalle cuando el gateway falla', async () => {
    w.gateways.sms.failWith('operador caído');
    const n = await w.create.execute(input);
    expect(n.status).toBe('failed');
    expect(n.errorMessage).toBe('operador caído');
    expect(n.attempts).toBe(1);
    expect(n.sentAt).toBeNull();
    expect(w.repo.stored(n.id)?.status).toBe('failed');
  });

  it('usa un mensaje por defecto si el gateway falla sin detalle', async () => {
    w.gateways.sms.failWith(null);
    const n = await w.create.execute(input);
    expect(n.status).toBe('failed');
    expect(n.errorMessage).toBe('Delivery failed');
  });

  it('un gateway que lanza excepción deja failed con su mensaje, sin propagar', async () => {
    w.gateways.sms.throwWith(new Error('socket hang up'));
    const n = await w.create.execute(input);
    expect(n.status).toBe('failed');
    expect(n.errorMessage).toBe('socket hang up');
    expect(n.attempts).toBe(1);
    expect(w.repo.stored(n.id)?.status).toBe('failed');
  });

  it('guarda pending ANTES de entregar y hace exactamente 2 saves', async () => {
    await w.create.execute(input);
    expect(w.repo.saves.map((s) => s.status)).toEqual(['pending', 'sent']);
    expect(w.log.events).toEqual([
      'save:pending',
      'deliver:persisted=pending',
      'save:sent',
    ]);
  });

  it('con fallo también son 2 saves: pending y failed', async () => {
    w.gateways.sms.failWith('x');
    await w.create.execute(input);
    expect(w.repo.saves.map((s) => s.status)).toEqual(['pending', 'failed']);
  });

  it('canal desconocido no escribe nada ni llama a ningún gateway', async () => {
    await expect(
      w.create.execute({ ...input, channel: 'fax' }),
    ).rejects.toThrow(UnknownChannel);
    expect(w.repo.size).toBe(0);
    expect(w.repo.saves).toHaveLength(0);
    expect(w.gateways.sms.calls).toBe(0);
  });

  it('ChannelRuleViolation no escribe nada ni llama al gateway', async () => {
    await expect(
      w.create.execute({ ...input, recipient: 'no-es-telefono' }),
    ).rejects.toThrow(ChannelRuleViolation);
    expect(w.repo.size).toBe(0);
    expect(w.repo.saves).toHaveLength(0);
    expect(w.gateways.sms.calls).toBe(0);
  });

  it('sms con más de 160 caracteres se rechaza sin escribir', async () => {
    await expect(
      w.create.execute({ ...input, content: 'x'.repeat(161) }),
    ).rejects.toThrow(ChannelRuleViolation);
    expect(w.repo.size).toBe(0);
  });

  it('funciona con otros canales (email)', async () => {
    const n = await w.create.execute({
      ...input,
      channel: 'email',
      recipient: 'a@b.com',
    });
    expect(n.status).toBe('sent');
    expect(w.gateways.email.calls).toBe(1);
    expect(w.gateways.sms.calls).toBe(0);
  });
});
