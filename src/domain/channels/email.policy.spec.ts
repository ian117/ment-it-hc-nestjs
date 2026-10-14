import { ChannelRuleViolation } from '../errors';
import { EmailPolicy } from './email.policy';

function violationsOf(fn: () => unknown) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ChannelRuleViolation);
    return (e as ChannelRuleViolation).violations;
  }
  throw new Error('expected ChannelRuleViolation');
}

describe('EmailPolicy', () => {
  const policy = new EmailPolicy();
  const draft = { title: 'Hola', content: 'Mundo', recipient: 'a@b.co' };

  it('expone el canal email', () => {
    expect(policy.channel).toBe('email');
  });

  it.each(['a@b.co', 'user.name+tag@sub.example.com', 'x@y.z'])(
    'acepta %s',
    (recipient) => {
      expect(() => policy.prepare({ ...draft, recipient })).not.toThrow();
    },
  );

  it.each([
    ['sin arroba', 'ab.co'],
    ['sin dominio', 'a@'],
    ['sin punto en el dominio', 'a@b'],
    ['con espacios', 'a b@c.co'],
    ['con espacio al final', 'a@b.co '],
    ['sin parte local', '@b.co'],
    ['dos arrobas', 'a@@b.co'],
    ['vacío', ''],
  ])('rechaza email %s', (_n, recipient) => {
    const v = violationsOf(() => policy.prepare({ ...draft, recipient }));
    expect(v).toHaveLength(1);
    expect(v[0].field).toBe('payload.recipient');
  });

  it('acepta exactamente 320 caracteres y rechaza 321', () => {
    const make = (len: number) => 'a'.repeat(len - 5) + '@b.co';
    expect(() =>
      policy.prepare({ ...draft, recipient: make(320) }),
    ).not.toThrow();
    const v = violationsOf(() =>
      policy.prepare({ ...draft, recipient: make(321) }),
    );
    expect(v[0].field).toBe('payload.recipient');
  });

  it('formatea el mensaje', () => {
    expect(policy.prepare(draft)).toEqual({
      channel: 'email',
      recipient: 'a@b.co',
      subject: 'Hola',
      body: 'Mundo',
      html: '<h1>Hola</h1><p>Mundo</p>',
      data: null,
    });
  });

  it('escapa HTML en title y content solo dentro de html', () => {
    const msg = policy.prepare({
      ...draft,
      title: `<b>"T" & 'x'</b>`,
      content: `<script>a&b</script>`,
    });
    expect(msg.html).toBe(
      '<h1>&lt;b&gt;&quot;T&quot; &amp; &#39;x&#39;&lt;/b&gt;</h1>' +
        '<p>&lt;script&gt;a&amp;b&lt;/script&gt;</p>',
    );
    expect(msg.subject).toBe(`<b>"T" & 'x'</b>`);
    expect(msg.body).toBe('<script>a&b</script>');
  });

  it('no muta el draft', () => {
    const d = Object.freeze({ ...draft });
    expect(() => policy.prepare(d)).not.toThrow();
    expect(d).toEqual(draft);
  });
});
