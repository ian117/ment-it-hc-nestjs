import { Email } from '../../domain/email';
import { InvalidCredentials, InvalidEmail } from '../../domain/errors';
import { PasswordHash } from '../../domain/password-hash';
import { User } from '../../domain/user';
import { PasswordHasher } from '../ports/password-hasher';
import { IssuedToken, TokenIssuer } from '../ports/token-issuer';
import { UserRepository } from '../ports/user.repository';

export interface LoginInput {
  email: string;
  password: string;
}

export class Login {
  private decoy?: Promise<PasswordHash>;

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenIssuer,
  ) {}

  async execute(input: LoginInput): Promise<IssuedToken> {
    const user = await this.findUser(input.email);
    if (!user) {
      // Verifica contra un señuelo para no filtrar por timing si el email existe.
      await this.hasher.verify(input.password, await this.decoyHash());
      throw new InvalidCredentials();
    }
    if (!(await this.hasher.verify(input.password, user.passwordHash))) {
      throw new InvalidCredentials();
    }
    return this.tokens.issue(user.id);
  }

  private async findUser(rawEmail: string): Promise<User | null> {
    let email: Email;
    try {
      email = Email.create(rawEmail);
    } catch (error) {
      if (error instanceof InvalidEmail) return null;
      throw error;
    }
    return this.users.findByEmail(email);
  }

  private decoyHash(): Promise<PasswordHash> {
    this.decoy ??= this.hasher.hash('decoy-password-for-timing-parity');
    return this.decoy;
  }
}
