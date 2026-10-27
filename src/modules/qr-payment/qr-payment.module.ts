/**
 * =============================================================
 * QR Payment Module
 * =============================================================
 * Feature module for QR-based payment operations.
 * Registers the entity, service, and controller.
 * =============================================================
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrPaymentRequest } from './entities/qr-payment-request.entity';
import { QrPaymentService } from './qr-payment.service';
import { QrPaymentController } from './qr-payment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([QrPaymentRequest])],
  controllers: [QrPaymentController],
  providers: [QrPaymentService],
  exports: [QrPaymentService], // Exported for SyncModule
})
export class QrPaymentModule {}
