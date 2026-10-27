/**
 * =============================================================
 * Sync Service (Blockchain ↔ MySQL Synchronization)
 * =============================================================
 * Handles the synchronization of blockchain transaction states
 * with the MySQL database. Core responsibilities:
 *
 *   - Query all PENDING transactions from payment_blockchain
 *   - Verify each tx_hash on-chain via the BlockchainService
 *   - Update status to CONFIRMED or FAILED based on receipt
 *   - Expire old QR payment requests
 *   - Provide manual sync triggers via API
 *
 * State Machine:
 *   PENDING ──→ CONFIRMED  (receipt.status === 1)
 *   PENDING ──→ FAILED     (receipt.status === 0, or tx not found)
 *
 * This service is called both by the cron scheduler and
 * manually via the Sync controller.
 * =============================================================
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentBlockchain,
  TransactionStatus,
} from '../payment/entities/payment-blockchain.entity';
import { BlockchainService } from '../blockchain/blockchain.service';
import { QrPaymentService } from '../qr-payment/qr-payment.service';

/**
 * Result of a sync operation
 */
export interface SyncResult {
  totalPending: number;
  confirmed: number;
  failed: number;
  stillPending: number;
  expiredQrRequests: number;
  syncedAt: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(PaymentBlockchain)
    private readonly blockchainRepository: Repository<PaymentBlockchain>,

    private readonly blockchainService: BlockchainService,
    private readonly qrPaymentService: QrPaymentService,
  ) {}

  // =========================================================
  // Main Sync Operation
  // =========================================================

  /**
   * Synchronize all PENDING blockchain transactions with on-chain state.
   *
   * Algorithm:
   * 1. Fetch all records with transactionStatus = PENDING
   * 2. For each record, verify the tx_hash on-chain
   * 3. Update status based on the transaction receipt:
   *    - receipt.status === 1 → CONFIRMED
   *    - receipt.status === 0 → FAILED
   *    - no receipt → remains PENDING
   * 4. Also expire old QR payment requests
   *
   * @returns Summary of the sync operation
   */
  async syncPendingTransactions(): Promise<SyncResult> {
    this.logger.log('Starting blockchain sync...');

    // Step 1: Fetch all PENDING transactions
    const pendingRecords = await this.blockchainRepository.find({
      where: { transactionStatus: TransactionStatus.PENDING },
    });

    this.logger.log(`Found ${pendingRecords.length} pending transactions`);

    let confirmed = 0;
    let failed = 0;
    let stillPending = 0;

    // Step 2: Verify each transaction on-chain
    for (const record of pendingRecords) {
      try {
        // Skip records with placeholder tx_hash (failed submissions)
        if (record.txHash.startsWith('FAILED_')) {
          record.transactionStatus = TransactionStatus.FAILED;
          await this.blockchainRepository.save(record);
          failed++;
          continue;
        }

        const verification = await this.blockchainService.verifyTransaction(
          record.txHash,
        );

        // Step 3: Update status based on verification result
        switch (verification.status) {
          case 'CONFIRMED':
            record.transactionStatus = TransactionStatus.CONFIRMED;
            record.gasUsed = verification.gasUsed;
            record.blockNumber = verification.blockNumber;
            await this.blockchainRepository.save(record);
            confirmed++;
            this.logger.log(
              `✅ Payment #${record.paymentId} CONFIRMED (block ${verification.blockNumber})`,
            );
            break;

          case 'FAILED':
            record.transactionStatus = TransactionStatus.FAILED;
            await this.blockchainRepository.save(record);
            failed++;
            this.logger.warn(
              `❌ Payment #${record.paymentId} FAILED (tx reverted)`,
            );
            break;

          case 'PENDING':
            stillPending++;
            this.logger.log(
              `⏳ Payment #${record.paymentId} still PENDING`,
            );
            break;
        }
      } catch (error) {
        this.logger.error(
          `Error verifying payment #${record.paymentId}: ${error}`,
        );
        stillPending++;
      }
    }

    // Step 4: Expire old QR requests
    let expiredQrRequests = 0;
    try {
      expiredQrRequests = await this.qrPaymentService.expireOldRequests();
      if (expiredQrRequests > 0) {
        this.logger.log(`Expired ${expiredQrRequests} QR payment requests`);
      }
    } catch (error) {
      this.logger.error(`Error expiring QR requests: ${error}`);
    }

    const result: SyncResult = {
      totalPending: pendingRecords.length,
      confirmed,
      failed,
      stillPending,
      expiredQrRequests,
      syncedAt: new Date().toISOString(),
    };

    this.logger.log(
      `Sync complete: ${confirmed} confirmed, ${failed} failed, ${stillPending} pending`,
    );

    return result;
  }

  // =========================================================
  // Reconciliation
  // =========================================================

  /**
   * Reconcile Sakila payments with blockchain records.
   * Finds payments that have blockchain records but may have
   * inconsistent states.
   *
   * @returns Reconciliation summary
   */
  async reconcilePayments(): Promise<{
    totalBlockchainRecords: number;
    confirmedCount: number;
    pendingCount: number;
    failedCount: number;
  }> {
    const records = await this.blockchainRepository.find();

    const confirmedCount = records.filter(
      (r) => r.transactionStatus === TransactionStatus.CONFIRMED,
    ).length;

    const pendingCount = records.filter(
      (r) => r.transactionStatus === TransactionStatus.PENDING,
    ).length;

    const failedCount = records.filter(
      (r) => r.transactionStatus === TransactionStatus.FAILED,
    ).length;

    return {
      totalBlockchainRecords: records.length,
      confirmedCount,
      pendingCount,
      failedCount,
    };
  }
}
