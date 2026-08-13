import { User } from 'src/entities/user.entity';

export interface UserInterface {
  userExist(email: string): Promise<boolean>;
  validateUser(email: string, password: string): Promise<User | null>;
  signUp(email: string, password: string): Promise<User>;
  generatePasswordResetToken(email: string): Promise<string>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}
