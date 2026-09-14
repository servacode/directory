import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './platform/global-exception.filter.js';
import { RequestIdMiddleware } from './platform/request-id.middleware.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const trustProxyHops=Number(process.env.TRUST_PROXY_HOPS??0);
  if(Number.isInteger(trustProxyHops)&&trustProxyHops>0) app.getHttpAdapter().getInstance().set('trust proxy',trustProxyHops);
  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  const requestId = new RequestIdMiddleware();
  app.use(requestId.use.bind(requestId));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  const origins = (process.env.CORS_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  app.enableCors({ origin: origins.length > 0 ? origins : false, credentials: true });
  app.enableShutdownHooks();
  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
