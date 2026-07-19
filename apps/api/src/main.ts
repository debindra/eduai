import './timezone';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
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
