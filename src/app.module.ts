/**
 * =============================================================
 * Root Application Module
 * =============================================================
 * Orchestrates all feature modules and configures:
 *   - ConfigModule: environment variable management
 *   - TypeOrmModule: MySQL/Sakila database connection
 *   - ScheduleModule: cron-based task scheduling
 *   - Feature modules: Payment, Blockchain, QrPayment, Sync
 * =============================================================
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Feature Modules
import { PaymentModule } from './modules/payment/payment.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { QrPaymentModule } from './modules/qr-payment/qr-payment.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    // ─── Environment Configuration ─────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,       // Available in all modules without re-importing
      envFilePath: '.env',  // Load from project root
    }),

    // ─── PostgreSQL / Sakila Database ─────────────────────
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_DATABASE', 'sakila'),
        autoLoadEntities: true,  // Auto-register entities from feature modules
        synchronize: false,      // CRITICAL: false to preserve Sakila schema
        logging: ['error'],      // Log only errors in production
      }),
    }),

    // ─── Task Scheduling (for blockchain sync cron) ────────
    ScheduleModule.forRoot(),

    // ─── Feature Modules ───────────────────────────────────
    PaymentModule,
    BlockchainModule,
    QrPaymentModule,
    SyncModule,
  ],
})
export class AppModule {}
