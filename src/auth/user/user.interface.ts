import { User } from "src/entities/user.entity";

export interface UserInterface {
  userExist(email: string): Promise<boolean>;
  validateUser(email, password): Promise<User | null>
  signUp(email: string, password: string): Promise<User>;
  generatePasswordResetToken(email: string): Promise<string>;
  resetPassword(token, newPassword): Promise <void>
}
