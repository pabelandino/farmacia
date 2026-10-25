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
  app.set('etag', false);
  app.use((req: { originalUrl?: string }, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    if (String(req.originalUrl || '').startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });
  attachSpa(app);

  await app.listen(port, host);
  console.log(`Elsa SYS listening on http://${host}:${port} (LAN: use this PC's IP)`);
}

bootstrap();
