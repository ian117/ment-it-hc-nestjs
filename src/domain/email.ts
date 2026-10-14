import { InvalidEmail } from './errors';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_EMAIL_LENGTH = 320;

/** Value object: correo normalizado (trim + minúsculas) y validado. */
export class Email {
  private constructor(readonly value: string) {}

  static create(raw: string): Email {
    const normalized = (raw ?? '').trim().toLowerCase();
    if (
      normalized.length > MAX_EMAIL_LENGTH ||
      !EMAIL_PATTERN.test(normalized)
    ) {
      throw new InvalidEmail();
    }
    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
