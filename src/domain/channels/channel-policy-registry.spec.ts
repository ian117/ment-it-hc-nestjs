import { UnknownChannel } from '../errors';
import { ChannelPolicy } from './channel-policy';
import { ChannelPolicyRegistry } from './channel-policy-registry';
import { EmailPolicy } from './email.policy';
import { PushPolicy } from './push.policy';
import { SmsPolicy } from './sms.policy';

describe('ChannelPolicyRegistry', () => {
  const email = new EmailPolicy();
  const sms = new SmsPolicy();
  const push = new PushPolicy();

  it('devuelve la política de cada canal registrado', () => {
    const r = new ChannelPolicyRegistry([email, sms, push]);
    expect(r.policy('email')).toBe(email);
    expect(r.policy('sms')).toBe(sms);
    expect(r.policy('push')).toBe(push);
  });

  it('lanza UnknownChannel con el nombre del canal', () => {
    const r = new ChannelPolicyRegistry([email]);
    try {
      r.policy('whatsapp');
      throw new Error('expected UnknownChannel');
    } catch (e) {
      expect(e).toBeInstanceOf(UnknownChannel);
      expect((e as UnknownChannel).channel).toBe('whatsapp');
    }
  });

  it('has() indica si el canal está registrado', () => {
    const r = new ChannelPolicyRegistry([email, sms]);
    expect(r.has('email')).toBe(true);
    expect(r.has('push')).toBe(false);
  });

  it('channels() lista los canales en orden de registro', () => {
    expect(new ChannelPolicyRegistry([sms, email]).channels()).toEqual([
      'sms',
      'email',
    ]);
    expect(new ChannelPolicyRegistry([]).channels()).toEqual([]);
  });

  it('rechaza canales duplicados', () => {
    expect(() => new ChannelPolicyRegistry([email, new EmailPolicy()])).toThrow(
      Error,
    );
  });

  it('admite canales nuevos sin tocar el registro (OCP)', () => {
    const whatsapp: ChannelPolicy = {
      channel: 'whatsapp',
      prepare: (d) => ({
        channel: 'whatsapp',
        recipient: d.recipient,
        subject: null,
        body: d.content,
        html: null,
        data: null,
      }),
    };
    const r = new ChannelPolicyRegistry([email, whatsapp]);
    expect(r.policy('whatsapp')).toBe(whatsapp);
  });
});
