import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  await app.listen(process.env.PORT ?? 3000);
}

// bootstrap(); // Verificar si es necesario hacer el wrapp

bootstrap().catch((err) => {
  console.error('Error starting the app: \n', err);
  process.exit(1);
});
