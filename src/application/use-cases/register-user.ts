import { Email } from '../../domain/email';
import { EmailAlreadyRegistered } from '../../domain/errors';
import { User } from '../../domain/user';
import { Clock } from '../ports/clock';
import { IdGenerator } from '../ports/id-generator';
import { PasswordHasher } from '../ports/password-hasher';
import { UserRepository } from '../ports/user.repository';

export interface RegisterUserInput {
  email: string;
  password: string;
}

export class RegisterUser {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const email = Email.create(input.email);
    // Camino rápido: evita un hash inútil. La carrera real la resuelve save.
    if (await this.users.findByEmail(email)) {
      throw new EmailAlreadyRegistered();
    }
    const passwordHash = await this.hasher.hash(input.password);
    const user = User.create({
      id: this.ids.newId(),
      email,
      passwordHash,
      now: this.clock.now(),
    });
    await this.users.save(user);
    return user;
  }
}
