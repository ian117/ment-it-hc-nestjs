import { InvalidResetToken } from '../../domain/errors';
import { Clock } from '../ports/clock';
import { PasswordHasher } from '../ports/password-hasher';
import { ResetTokenGenerator } from '../ports/reset-token-generator';
import { ResetTokenRepository } from '../ports/reset-token.repository';
import { UserRepository } from '../ports/user.repository';

export interface ConfirmPasswordResetInput {
  token: string;
  newPassword: string;
}

export class ConfirmPasswordReset {
  constructor(
    private readonly users: UserRepository,
    private readonly resetTokens: ResetTokenRepository,
    private readonly hasher: PasswordHasher,
    private readonly generator: ResetTokenGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: ConfirmPasswordResetInput): Promise<void> {
    const stored = await this.resetTokens.findByHash(
      this.generator.hash(input.token),
    );
    if (!stored) throw new InvalidResetToken();

    const now = this.clock.now();
    stored.markUsed(now); // InvalidResetToken si está vencido o usado

    const user = await this.users.findById(stored.userId);
    if (!user) throw new InvalidResetToken();

    const newHash = await this.hasher.hash(input.newPassword);

    // Se quema antes de cambiar la contraseña: falla del lado seguro.
    if (!(await this.resetTokens.consume(stored))) {
      throw new InvalidResetToken();
    }
    user.changePassword(newHash, now);
    await this.users.save(user);
  }
}
