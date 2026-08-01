import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User } from 'src/entities/user.entity';
import { UserInterface } from './user.interface';

@Injectable()
export class UserService implements UserInterface {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async userExist(email: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { email } });
    return Boolean(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { email },
      select: { id: true, email: true, password: true },
    });
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? user : null;
  }

  async signUp(email: string, password: string): Promise<User> {
    if (await this.userExist(email)) {
      throw new ConflictException('User already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ email, password: hashedPassword });
    return this.userRepo.save(user);
  }

  async generatePasswordResetToken(email: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await this.userRepo.save(user);

    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { resetPasswordToken: token },
    });

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired token');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepo.save(user);
  }
}
