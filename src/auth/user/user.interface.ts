import { User } from "src/entities/user.entity";

export interface UserInterface {
  userExist(email: string): Promise<boolean>;
  signUp(email: string, password: string): Promise<User>;
  matchEmailPassword(email: string, password: string): Promise<boolean>;
  generatePasswordResetToken(email: string): Promise<string>;
}
