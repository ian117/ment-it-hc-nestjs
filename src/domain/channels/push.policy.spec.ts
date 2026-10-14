import { ChannelRuleViolation } from '../errors';
import { PushPolicy } from './push.policy';

function violationsOf(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ChannelRuleViolation);
    return (e as ChannelRuleViolation).violations;
  }
  throw new Error('expected ChannelRuleViolation');
}

describe('PushPolicy', () => {
  const policy = new PushPolicy();
  const draft = { title: 'Hola', content: 'Mundo', recipient: 'abcd1234' };

  it('expone el canal push', () => {
    expect(policy.channel).toBe('push');
  });

  it.each(['abcd1234', 'fcm:APA91b_token-1.x', 'A'.repeat(4096)])(
    'acepta token %s',
    (recipient) => {
      expect(() => policy.prepare({ ...draft, recipient })).not.toThrow();
    },
  );

  it('acepta 8 caracteres y rechaza 7', () => {
    expect(() =>
      policy.prepare({ ...draft, recipient: 'a'.repeat(8) }),
    ).not.toThrow();
    const v = violationsOf(() =>
      policy.prepare({ ...draft, recipient: 'a'.repeat(7) }),
    );
    expect(v[0].field).toBe('payload.recipient');
  });

  it('acepta 4096 caracteres y rechaza 4097', () => {
    expect(() =>
      policy.prepare({ ...draft, recipient: 'a'.repeat(4096) }),
    ).not.toThrow();
    expect(() =>
      policy.prepare({ ...draft, recipient: 'a'.repeat(4097) }),
    ).toThrow(ChannelRuleViolation);
  });

  it.each([
    ['vacío', ''],
    ['con espacio', 'abcd 1234'],
    ['con @', 'abcd@1234'],
    ['con barra', 'abcd/1234'],
    ['con acento', 'abcdéfgh'],
    ['con salto de línea', 'abcd1234\n'],
  ])('rechaza token %s', (_n, recipient) => {
    const v = violationsOf(() => policy.prepare({ ...draft, recipient }));
    expect(v.map((x) => x.field)).toEqual(['payload.recipient']);
  });

  it('formatea el mensaje', () => {
    expect(policy.prepare(draft)).toEqual({
      channel: 'push',
      recipient: 'abcd1234',
      subject: null,
      body: 'Mundo',
      html: null,
      data: { title: 'Hola', body: 'Mundo' },
    });
  });

  it('no muta el draft', () => {
    const d = Object.freeze({ ...draft });
    expect(() => policy.prepare(d)).not.toThrow();
    expect(d).toEqual(draft);
  });
});
