/**
 * =============================================================
 * NestJS Application Bootstrap
 * =============================================================
 * Entry point for the Sakila Blockchain Integration API.
 * Configures:
 *   - Swagger/OpenAPI documentation
 *   - Global validation pipes
 *   - Global exception filters
 *   - Global response interceptors
 *   - CORS for cross-origin requests
 * =============================================================
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // ─── Global Prefix ───────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── CORS ────────────────────────────────────────────────
  app.enableCors({
    origin: '*', // In production, restrict to specific origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Global Pipes ────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true,            // Auto-transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Global Filters ──────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ─── Global Interceptors ─────────────────────────────────
  app.useGlobalInterceptors(new TransformInterceptor());

  // ─── Swagger Documentation ───────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('API de Integración Sakila Blockchain')
    .setDescription(
      `API de arquitectura híbrida que integra MySQL (base de datos Sakila) con ` +
      `la blockchain de Ethereum (Ganache). Proporciona operaciones CRUD de pagos, ` +
      `gestión de transacciones en blockchain, generación de pagos mediante códigos QR ` +
      `y sincronización de transacciones en tiempo real.`,
    )
    .setVersion('1.0.0')
    .addTag('Pagos', 'Operaciones CRUD para pagos de Sakila con integración blockchain')
    .addTag('Blockchain', 'Interacción con la blockchain de Ethereum y verificación de transacciones')
    .addTag('Pagos QR', 'Generación de códigos QR para solicitudes de pago EIP-681')
    .addTag('Sincronización', 'Operaciones de sincronización Blockchain ↔ MySQL')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // ─── Start Server ────────────────────────────────────────
  const port = process.env.APP_PORT || 3000;
  await app.listen(port);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  🚀 Sakila Blockchain API running on port ${port}`);
  console.log(`  📖 Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`  🔗 API base URL: http://localhost:${port}/api/v1`);
  console.log(`${'='.repeat(60)}\n`);
}

bootstrap();
