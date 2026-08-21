import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { initSentry } from './sentry.config';
import { SentryExceptionFilter } from './sentry.filter';
import helmet from 'helmet';

async function bootstrap() {
  // Initialize Sentry before creating the app
  initSentry();

  // Create app with raw body support for Stripe webhooks
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  // Use Pino logger
  app.useLogger(app.get(Logger));

  // Security headers
  app.use(helmet());

  // CORS — whitelist production domains + local dev
  const allowedOrigins = [
    'https://zidohaccp.com',
    'https://www.zidohaccp.com',
    'https://app.zidohaccp.com',
  ];
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:3000', 'http://localhost:19006');
  }
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Sentry error tracking
  app.useGlobalFilters(new SentryExceptionFilter());

  // Swagger — only in non-production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('HACCP APP API')
      .setDescription('API documentation')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Application is running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}

void bootstrap();
