import 'reflect-metadata';
import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { attachSpa } from './spa';

dotenv.config();
dotenv.config({ path: resolve(process.cwd(), 'apps/api/.env') });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const host = process.env.HOST || '0.0.0.0';
  const port = Number(process.env.PORT || process.env.API_PORT || 3001);

  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  attachSpa(app);

  await app.listen(port, host);
  console.log(`Elsa SYS listening on http://${host}:${port} (LAN: use this PC's IP)`);
}

bootstrap();
