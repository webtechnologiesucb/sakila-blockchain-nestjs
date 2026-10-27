/**
 * =============================================================
 * Sync Scheduler (Cron-based Blockchain Sync)
 * =============================================================
 * Periodically synchronizes blockchain transaction states with
 * the MySQL database using @nestjs/schedule.
 *
 * Default interval: every 30 seconds (configurable via SYNC_INTERVAL_MS)
 *
 * The scheduler:
 *   1. Calls SyncService.syncPendingTransactions()
 *   2. Logs the results
 *   3. Prevents overlapping runs with a lock flag
 * =============================================================
 */
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { SyncService } from './sync.service';

@Injectable()
export class SyncScheduler {
  private readonly logger = new Logger(SyncScheduler.name);
  private isRunning = false;

  constructor(private readonly syncService: SyncService) {}

  /**
   * Scheduled task: sync pending blockchain transactions.
   *
   * Runs every 30 seconds. Uses a lock flag to prevent
   * overlapping executions if a sync takes longer than
   * the interval.
   */
  @Interval(30000) // 30 seconds
  async handleSyncCron(): Promise<void> {
    // Prevent overlapping runs
    if (this.isRunning) {
      this.logger.debug('Sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      const result = await this.syncService.syncPendingTransactions();

      // Only log if there was something to sync
      if (result.totalPending > 0 || result.expiredQrRequests > 0) {
        this.logger.log(
          `⏰ Cron sync: ${result.confirmed} confirmed, ` +
          `${result.failed} failed, ${result.stillPending} pending, ` +
          `${result.expiredQrRequests} QR expired`,
        );
      }
    } catch (error) {
      this.logger.error(`Cron sync failed: ${error}`);
    } finally {
      this.isRunning = false;
    }
  }
}
