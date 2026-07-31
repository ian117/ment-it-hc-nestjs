import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/entities/user.entity';
import { UserInterface } from './user.interface';

@Injectable()
export class UserService implements UserInterface {

    constructor(
        @InjectRepository(User) private readonly userRepo: Repository<User>,
    ){}

    async userExist(email: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { email } });
    return Boolean(user);
    }

    async signUp(email: string, password: string): Promise<User> {
    if (await this.userExist(email)) {
      throw new ConflictException('User already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ email, password: hashedPassword });
    return this.userRepo.save(user);
    }

    async matchEmailPassword(email: string, password: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return false;
    // No se usa userExist por que se necesita el Active Record 
    return bcrypt.compare(password, user.password);
    }

    async generatePasswordResetToken(email: string): Promise<string> {
    throw new Error('Method not implemented.');
    }
    
}
