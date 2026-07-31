import { Module } from '@nestjs/common';
import { UserService } from './user/user.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserService],
  controllers: [AuthController]
})
export class AuthModule {}
