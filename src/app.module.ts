import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DataSource } from 'typeorm';

import { AuthModule } from './auth.module';
import { NotificationsModule } from './notifications.module';

import { AppController } from './app.controller';

import { AppService } from './app.service';

import configuration from './config/configuration';
import { ProblemDetailsFilter } from './api/problem-details.filter';
import { createValidationPipe } from './api/request-validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        database: configService.get<string>('database.name'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),
        synchronize: false,
        autoLoadEntities: true,
      }),
    }),
    // Techo global laxo. Los endpoints sensibles (login, reset) lo bajan
    // con @Throttle en su propio controller.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_PIPE,
      useValue: createValidationPipe(),
    },
  ],
})
export class AppModule {
  constructor(private dataSource: DataSource) {}
}
