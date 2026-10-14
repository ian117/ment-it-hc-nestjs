import { InvalidResetToken } from './errors';
import { PasswordResetToken } from './password-reset-token';

const NOW = new Date('2026-01-01T10:00:00.000Z');
const EXPIRES = new Date('2026-01-01T10:15:00.000Z');

describe('PasswordResetToken', () => {
  const make = () =>
    PasswordResetToken.create({
      id: 't1',
      userId: 'u1',
      tokenHash: 'h',
      expiresAt: EXPIRES,
      now: NOW,
    });

  it('create: sin usar y createdAt = now', () => {
    const t = make();
    expect(t.usedAt).toBeNull();
    expect(t.createdAt).toEqual(NOW);
    expect(t.expiresAt).toEqual(EXPIRES);
    expect(t.userId).toBe('u1');
    expect(t.tokenHash).toBe('h');
  });

  it('isUsable: 1 ms antes de expiresAt sí, en expiresAt no', () => {
    const t = make();
    expect(t.isUsable(new Date(EXPIRES.getTime() - 1))).toBe(true);
    expect(t.isUsable(EXPIRES)).toBe(false);
    expect(t.isUsable(new Date(EXPIRES.getTime() + 1))).toBe(false);
  });

  it('markUsed fija usedAt', () => {
    const t = make();
    t.markUsed(NOW);
    expect(t.usedAt).toEqual(NOW);
    expect(t.isUsable(NOW)).toBe(false);
  });

  it('markUsed rechazado por uso previo no muta', () => {
    const t = make();
    t.markUsed(NOW);
    const later = new Date(NOW.getTime() + 1000);
    expect(() => t.markUsed(later)).toThrow(InvalidResetToken);
    expect(t.usedAt).toEqual(NOW);
  });

  it('markUsed rechazado por vencimiento no muta', () => {
    const t = make();
    expect(() => t.markUsed(EXPIRES)).toThrow(InvalidResetToken);
    expect(t.usedAt).toBeNull();
  });

  it('restore conserva usedAt', () => {
    const r = PasswordResetToken.restore({
      id: 't1',
      userId: 'u1',
      tokenHash: 'h',
      expiresAt: EXPIRES,
      usedAt: NOW,
      createdAt: NOW,
    });
    expect(r.usedAt).toEqual(NOW);
    expect(r.isUsable(NOW)).toBe(false);
  });
});
