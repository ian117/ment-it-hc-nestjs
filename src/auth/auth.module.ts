import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { UserService } from './user/user.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { USER_SERVICE } from './user/user-service.token';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          // jsonwebtoken tipa expiresIn como un template literal ('1h', '7d'...),
          // que un string de config no puede satisfacer sin ayuda.
          expiresIn: configService.get<string>(
            'jwt.expiresIn',
          ) as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  providers: [{ provide: USER_SERVICE, useClass: UserService }, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
