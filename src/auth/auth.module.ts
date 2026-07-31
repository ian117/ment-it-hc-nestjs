import { Module } from '@nestjs/common';
import { UserService } from './user/user.service';
import { AuthController } from './auth.controller';

@Module({
  providers: [UserService],
  controllers: [AuthController]
})
export class AuthModule {}
