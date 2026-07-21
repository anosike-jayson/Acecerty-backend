import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // rawBody needed for webhook signature verification
    rawBody: true,
  });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  // Serve uploaded images (Iteration 1 local disk).
  app.useStaticAssets(join(process.cwd(), config.get<string>('uploadDir') || 'uploads'), {
    prefix: '/uploads/',
  });

  app.enableCors({
    origin: [config.get<string>('frontendBaseUrl')!],
    credentials: true,
  });

  // Capture raw body so payment webhooks can verify signatures.
  app.use(
    json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(urlencoded({ extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Swagger / OpenAPI ─────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Acecerty API')
    .setDescription(
      'Acecerty — IT-certification training & exam-prep platform (Iteration 1). ' +
        'Auth uses a Bearer access token; obtain one via POST /api/auth/login.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('Auth', 'Registration, login, refresh, password & email flows')
    .addTag('Users', 'Self profile (/me) & admin user management')
    .addTag('Instructors', 'Instructor catalog — public read + admin CRUD')
    .addTag('Courses', 'Course catalog, modules & lessons — public read + admin CRUD')
    .addTag('Exam Catalog', 'Exam products, exam forms & topics — public read + admin CRUD')
    .addTag('Questions', 'Question bank CRUD + bulk import (admin)')
    .addTag('Exam Engine', 'Server-authoritative attempts, timer, scoring, review')
    .addTag('Entitlements', 'Access grants covering purchased items')
    .addTag('Commerce', 'Cart, orders & payment initialization')
    .addTag('Webhooks', 'Signature-verified provider webhooks (Paystack/Flutterwave)')
    .addTag('Admin', 'Dashboard stats, orders/payments/attempts & audit logs')
    .addTag('Uploads', 'Admin image uploads')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  // Apply the bearer scheme to every operation so the Authorize token is sent
  // to all endpoints (public routes simply ignore it).
  document.security = [{ 'access-token': [] }];
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('port')!;
  await app.listen(port);
  Logger.log(`Acecerty API listening on http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`Swagger docs at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
