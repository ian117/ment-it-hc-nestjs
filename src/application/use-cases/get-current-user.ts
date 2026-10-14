import { UserNotFound } from '../../domain/errors';
import { User } from '../../domain/user';
import { UserRepository } from '../ports/user.repository';

export interface GetCurrentUserInput {
  userId: string;
}

export class GetCurrentUser {
  constructor(private readonly users: UserRepository) {}

  async execute(input: GetCurrentUserInput): Promise<User> {
    const user = await this.users.findById(input.userId);
    if (!user) throw new UserNotFound(input.userId);
    return user;
  }
}
