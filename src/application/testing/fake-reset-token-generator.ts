import {
  GeneratedResetToken,
  ResetTokenGenerator,
} from '../ports/reset-token-generator';

export class FakeResetTokenGenerator implements ResetTokenGenerator {
  private counter = 0;

  generate(): GeneratedResetToken {
    this.counter += 1;
    const token = `reset-token-${this.counter}`;
    return { token, tokenHash: this.hash(token) };
  }

  hash(token: string): string {
    return `hash-of-${token}`;
  }
}
