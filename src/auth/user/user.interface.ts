import { User } from 'src/entities/user.entity';

export interface UserInterface {
  userExist(email: string): Promise<boolean>;
  validateUser(email: string, password: string): Promise<User | null>;
  signUp(email: string, password: string): Promise<User>;
  /** null cuando el email no existe -- ver la nota de anti-enumeracion. */
  generatePasswordResetToken(email: string): Promise<string | null>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}
