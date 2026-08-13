import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
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
    // Fast-path amable: evita hashear un password que ya sabemos que sobra.
    // NO es lo que garantiza unicidad -- entre este check y el insert hay una
    // ventana en la que otra request puede insertar el mismo email.
    if (await this.userExist(email)) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ email, password: hashedPassword });

    try {
      return await this.userRepo.save(user);
    } catch (error) {
      // Quien realmente cierra la carrera es la constraint UNIQUE de Postgres.
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('User already exists');
      }
      throw error;
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { code?: string }).code === '23505'
    );
  }

  async generatePasswordResetToken(email: string): Promise<string> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const token = crypto.randomBytes(32).toString('hex');

    // update() y no save(): con select:false la entity cargada no trae password,
    // y un save() sobre una entity con campos undefined es un pie en la trampa.
    await this.userRepo.update(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    });

    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { resetPasswordToken: token },
      // resetPasswordExpires es select:false -> hay que pedirlo explicitamente,
      // si no la comparacion de expiracion siempre da undefined.
      select: { id: true, resetPasswordExpires: true },
    });

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.userRepo.update(user.id, {
      password: await bcrypt.hash(newPassword, 10),
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }
}
