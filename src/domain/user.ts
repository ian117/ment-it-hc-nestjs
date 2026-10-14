import { Email } from './email';
import { PasswordHash } from './password-hash';

export interface CreateUserProps {
  id: string;
  email: Email;
  passwordHash: PasswordHash;
  now: Date;
}

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: PasswordHash;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private props: UserProps) {}

  static create(input: CreateUserProps): User {
    return new User({
      id: input.id,
      email: input.email,
      passwordHash: input.passwordHash,
      createdAt: new Date(input.now),
      updatedAt: new Date(input.now),
    });
  }

  /** Reconstruye desde estado persistido. */
  static restore(props: UserProps): User {
    return new User({
      ...props,
      createdAt: new Date(props.createdAt),
      updatedAt: new Date(props.updatedAt),
    });
  }

  get id(): string {
    return this.props.id;
  }
  get email(): Email {
    return this.props.email;
  }
  get passwordHash(): PasswordHash {
    return this.props.passwordHash;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  changePassword(passwordHash: PasswordHash, at: Date): void {
    this.props.passwordHash = passwordHash;
    this.props.updatedAt = new Date(at);
  }
}
