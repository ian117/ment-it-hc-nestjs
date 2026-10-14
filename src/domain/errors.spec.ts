import { ChannelRuleViolation, UnknownChannel } from './errors';

describe('ChannelRuleViolation', () => {
  it('conserva las violaciones', () => {
    const v = [{ field: 'content', message: 'too long' }];
    const e = new ChannelRuleViolation(v);
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(ChannelRuleViolation);
    expect(e.name).toBe('ChannelRuleViolation');
    expect(e.violations).toEqual(v);
  });

  it('exige al menos una violación', () => {
    expect(() => new ChannelRuleViolation([])).toThrow(Error);
  });
});

describe('UnknownChannel', () => {
  it('conserva el nombre del canal', () => {
    const e = new UnknownChannel('fax');
    expect(e).toBeInstanceOf(UnknownChannel);
    expect(e.name).toBe('UnknownChannel');
    expect(e.channel).toBe('fax');
    expect(e.message).toContain('fax');
  });
});
