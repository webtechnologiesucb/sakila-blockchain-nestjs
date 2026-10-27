/**
 * =============================================================
 * Blockchain Module
 * =============================================================
 * Registers the Blockchain feature module:
 *   - BlockchainService: ethers.js provider & wallet management
 *   - ContractService: PaymentProcessor contract interactions
 *   - BlockchainController: REST endpoints for blockchain queries
 *
 * Both services are exported so other modules (Payment, Sync)
 * can inject them.
 * =============================================================
 */
import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { ContractService } from './contract.service';
import { BlockchainController } from './blockchain.controller';

@Module({
  controllers: [BlockchainController],
  providers: [BlockchainService, ContractService],
  exports: [BlockchainService, ContractService], // Available to PaymentModule, SyncModule
})
export class BlockchainModule {}
