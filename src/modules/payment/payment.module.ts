/**
 * =============================================================
 * Payment Module
 * =============================================================
 * Registers the Payment feature module with NestJS. Configures:
 *   - TypeORM entities (Payment, PaymentBlockchain)
 *   - Payment service and controller
 *   - Imports BlockchainModule for cross-module dependency
 * =============================================================
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentBlockchain } from './entities/payment-blockchain.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentBlockchain]),
    BlockchainModule, // For BlockchainService and ContractService
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService], // Exported for SyncModule
})
export class PaymentModule {}
