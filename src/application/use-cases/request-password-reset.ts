import { Email } from '../../domain/email';
import { PasswordResetToken } from '../../domain/password-reset-token';
import { Clock } from '../ports/clock';
import { IdGenerator } from '../ports/id-generator';
import { ResetTokenGenerator } from '../ports/reset-token-generator';
import { ResetTokenRepository } from '../ports/reset-token.repository';
import { UserRepository } from '../ports/user.repository';

export interface RequestPasswordResetInput {
  email: string;
}

export class RequestPasswordReset {
  constructor(
    private readonly users: UserRepository,
    private readonly resetTokens: ResetTokenRepository,
    private readonly generator: ResetTokenGenerator,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly ttlMinutes: number,
  ) {}

  /** Token en claro si el usuario existe; null si no. Guarda solo el hash. */
  async execute(input: RequestPasswordResetInput): Promise<string | null> {
    const email = Email.create(input.email);
    const user = await this.users.findByEmail(email);
    if (!user) return null;

    const now = this.clock.now();
    const { token, tokenHash } = this.generator.generate();
    await this.resetTokens.save(
      PasswordResetToken.create({
        id: this.ids.newId(),
        userId: user.id,
        tokenHash,
        expiresAt: new Date(now.getTime() + this.ttlMinutes * 60_000),
        now,
      }),
    );
    return token;
  }
}
