import { InvalidResetToken } from './errors';

export interface CreatePasswordResetTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  now: Date;
}

export interface PasswordResetTokenProps {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export class PasswordResetToken {
  private constructor(private props: PasswordResetTokenProps) {}

  static create(input: CreatePasswordResetTokenProps): PasswordResetToken {
    return new PasswordResetToken({
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: new Date(input.expiresAt),
      usedAt: null,
      createdAt: new Date(input.now),
    });
  }

  /** Reconstruye desde estado persistido. */
  static restore(props: PasswordResetTokenProps): PasswordResetToken {
    return new PasswordResetToken({
      ...props,
      expiresAt: new Date(props.expiresAt),
      usedAt: props.usedAt ? new Date(props.usedAt) : null,
      createdAt: new Date(props.createdAt),
    });
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get tokenHash(): string {
    return this.props.tokenHash;
  }
  get expiresAt(): Date {
    return this.props.expiresAt;
  }
  get usedAt(): Date | null {
    return this.props.usedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Sin usar y no vencido (vence exactamente en `expiresAt`). */
  isUsable(at: Date): boolean {
    return (
      this.props.usedAt === null &&
      this.props.expiresAt.getTime() > at.getTime()
    );
  }

  /** Quema el token; si no es usable lanza sin mutar. */
  markUsed(at: Date): void {
    if (!this.isUsable(at)) {
      throw new InvalidResetToken();
    }
    this.props.usedAt = new Date(at);
  }
}
