/**
 * =============================================================
 * Sync Module
 * =============================================================
 * Registers the synchronization feature module:
 *   - SyncService: blockchain ↔ MySQL synchronization logic
 *   - SyncScheduler: cron-based periodic sync
 *   - SyncController: manual sync trigger endpoints
 *
 * Dependencies:
 *   - BlockchainModule: for verifying transactions on-chain
 *   - QrPaymentModule: for expiring old QR requests
 *   - TypeOrmModule: for accessing PaymentBlockchain entity
 * =============================================================
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentBlockchain } from '../payment/entities/payment-blockchain.entity';
import { SyncService } from './sync.service';
import { SyncScheduler } from './sync.scheduler';
import { SyncController } from './sync.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { QrPaymentModule } from '../qr-payment/qr-payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentBlockchain]),
    BlockchainModule,
    QrPaymentModule,
  ],
  controllers: [SyncController],
  providers: [SyncService, SyncScheduler],
  exports: [SyncService],
})
export class SyncModule {}
