import { ChannelRuleViolation } from '../errors';
import { SmsPolicy } from './sms.policy';

function violationsOf(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ChannelRuleViolation);
    return (e as ChannelRuleViolation).violations;
  }
  throw new Error('expected ChannelRuleViolation');
}

describe('SmsPolicy', () => {
  const policy = new SmsPolicy();
  const draft = {
    title: 'Hola',
    content: 'Mundo',
    recipient: '+5219611234567',
  };

  it('expone el canal sms', () => {
    expect(policy.channel).toBe('sms');
  });

  it.each(['+5219611234567', '+12', '+1' + '2'.repeat(14)])(
    'acepta E.164 %s',
    (recipient) => {
      expect(() => policy.prepare({ ...draft, recipient })).not.toThrow();
    },
  );

  it.each([
    ['sin +', '5219611234567'],
    ['con 0 inicial tras +', '+0123456789'],
    ['16 dígitos', '+' + '1'.repeat(16)],
    ['solo un dígito', '+1'],
    ['con letras', '+52abc'],
    ['con espacios', '+52 196 1234567'],
    ['vacío', ''],
  ])('rechaza teléfono %s', (_n, recipient) => {
    const v = violationsOf(() => policy.prepare({ ...draft, recipient }));
    expect(v.map((x) => x.field)).toEqual(['payload.recipient']);
  });

  it('acepta 15 dígitos (límite) y rechaza 16', () => {
    expect(() =>
      policy.prepare({ ...draft, recipient: '+' + '1'.repeat(15) }),
    ).not.toThrow();
    expect(() =>
      policy.prepare({ ...draft, recipient: '+' + '1'.repeat(16) }),
    ).toThrow(ChannelRuleViolation);
  });

  it('acepta 160 code points y rechaza 161', () => {
    expect(() =>
      policy.prepare({ ...draft, content: 'a'.repeat(160) }),
    ).not.toThrow();
    const v = violationsOf(() =>
      policy.prepare({ ...draft, content: 'a'.repeat(161) }),
    );
    expect(v.map((x) => x.field)).toEqual(['content']);
  });

  it('cuenta code points, no unidades UTF-16', () => {
    // '😀' ocupa 2 unidades UTF-16 pero es 1 code point
    expect(() =>
      policy.prepare({ ...draft, content: '😀'.repeat(160) }),
    ).not.toThrow();
    expect(() =>
      policy.prepare({ ...draft, content: '😀'.repeat(161) }),
    ).toThrow(ChannelRuleViolation);
  });

  it('reporta todas las violaciones a la vez', () => {
    const v = violationsOf(() =>
      policy.prepare({ ...draft, recipient: 'x', content: 'a'.repeat(161) }),
    );
    expect(v.map((x) => x.field).sort()).toEqual([
      'content',
      'payload.recipient',
    ]);
  });

  it('formatea el mensaje', () => {
    expect(policy.prepare(draft)).toEqual({
      channel: 'sms',
      recipient: '+5219611234567',
      subject: null,
      body: 'Mundo',
      html: null,
      data: null,
    });
  });

  it('no trunca ni muta el draft', () => {
    const d = Object.freeze({ ...draft });
    const msg = policy.prepare(d);
    expect(msg.body).toBe(d.content);
    expect(d).toEqual(draft);
  });
});
