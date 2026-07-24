import './timezone';
import 'reflect-metadata';
import * as Sentry from '@sentry/node';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // Initialize Sentry before app creation (optional - only if DSN provided)
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
      beforeSend(event, hint) {
        // Don't send errors in development to avoid noise
        if (process.env.NODE_ENV === 'development') {
          console.error('[Sentry] Error captured (not sent in dev):', hint.originalException);
          return null;
        }
        return event;
      },
    });
  }

  const app = await NestFactory.create(AppModule);

  // Allow both localhost and 127.0.0.1 — browsers treat them as distinct origins.
  const corsOrigin =
    process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173';
  app.enableCors({
    origin: corsOrigin.split(',').map((value) => value.trim()).filter(Boolean),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EduAI Nepal API')
    .setDescription('WhatsApp-first education platform API (Admin + Teacher)')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });

  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
