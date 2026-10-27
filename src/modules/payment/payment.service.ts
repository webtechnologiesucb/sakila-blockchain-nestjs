/**
 * =============================================================
 * Payment Service
 * =============================================================
 * Business logic layer for payment operations. Orchestrates:
 *   - CRUD operations on the Sakila `payment` table
 *   - Creating blockchain records in `payment_blockchain`
 *   - Coordinating with the BlockchainService for on-chain tx
 *   - Paginated queries with blockchain join data
 *
 * This service follows the Single Responsibility Principle:
 *   - Database operations are handled via TypeORM repositories
 *   - Blockchain operations are delegated to BlockchainService
 * =============================================================
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import {
  PaymentBlockchain,
  TransactionStatus,
} from './entities/payment-blockchain.entity';
import {
  CreateBlockchainPaymentDto,
  UpdatePaymentStatusDto,
  PaymentWithBlockchainResponseDto,
} from './dto/payment.dto';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ContractService } from '../blockchain/contract.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    @InjectRepository(PaymentBlockchain)
    private readonly blockchainRepository: Repository<PaymentBlockchain>,

    private readonly blockchainService: BlockchainService,
    private readonly contractService: ContractService,
  ) {}

  // =========================================================
  // CREATE: New payment with blockchain recording
  // =========================================================

  /**
   * Creates a new payment in Sakila AND records it on the blockchain.
   *
   * Flow:
   * 1. Insert payment record into Sakila `payment` table
   * 2. Send ETH transaction via smart contract
   * 3. Store tx_hash in `payment_blockchain` table
   * 4. Return combined payment + blockchain data
   *
   * @param dto - Payment creation data
   * @returns Combined payment and blockchain response
   */
  async createBlockchainPayment(
    dto: CreateBlockchainPaymentDto,
  ): Promise<PaymentWithBlockchainResponseDto> {
    this.logger.log(`Creating blockchain payment for customer ${dto.customerId}`);

    // Step 1: Create Sakila payment record
    const payment = this.paymentRepository.create({
      customerId: dto.customerId,
      staffId: dto.staffId,
      rentalId: dto.rentalId || null,
      amount: dto.amount,
      paymentDate: new Date(),
    });

    const savedPayment = await this.paymentRepository.save(payment);
    this.logger.log(`Sakila payment created: ID ${savedPayment.paymentId}`);

    // Step 2: Send blockchain transaction via smart contract
    let txHash: string;
    let gasUsed: number | null = null;
    let blockNumber: number | null = null;
    let contractAddress: string | null = null;

    try {
      const reference = dto.reference || `Sakila Payment #${savedPayment.paymentId}`;

      // Call the smart contract's registerPayment function
      const txResult = await this.contractService.registerPayment(
        savedPayment.paymentId,
        reference,
        dto.amountEth,
      );

      txHash = txResult.txHash;
      gasUsed = txResult.gasUsed;
      blockNumber = txResult.blockNumber;
      contractAddress = txResult.contractAddress;

      this.logger.log(`Blockchain tx sent: ${txHash}`);
    } catch (error) {
      this.logger.error(`Blockchain transaction failed: ${error}`);

      // Still create the blockchain record with FAILED status
      const failedRecord = this.blockchainRepository.create({
        paymentId: savedPayment.paymentId,
        txHash: `FAILED_${Date.now()}`,
        walletAddress: dto.walletAddress,
        contractAddress: null,
        amountEth: dto.amountEth,
        gasUsed: null,
        blockNumber: null,
        transactionStatus: TransactionStatus.FAILED,
      });
      await this.blockchainRepository.save(failedRecord);

      throw new InternalServerErrorException(
        `Payment created (ID: ${savedPayment.paymentId}) but blockchain transaction failed: ${error}`,
      );
    }

    // Step 3: Store blockchain record in MySQL
    const blockchainRecord = this.blockchainRepository.create({
      paymentId: savedPayment.paymentId,
      txHash,
      walletAddress: dto.walletAddress,
      contractAddress,
      amountEth: dto.amountEth,
      gasUsed,
      blockNumber,
      transactionStatus: TransactionStatus.CONFIRMED,
    });

    const savedBlockchain = await this.blockchainRepository.save(blockchainRecord);
    this.logger.log(`Blockchain record saved: ID ${savedBlockchain.id}`);

    // Step 4: Return combined response
    return this.formatPaymentResponse(savedPayment, savedBlockchain);
  }

  // =========================================================
  // READ: Get single payment with blockchain data
  // =========================================================

  /**
   * Retrieves a payment by ID with its associated blockchain data.
   *
   * @param paymentId - The Sakila payment_id
   * @returns Payment with blockchain details
   */
  async getPaymentWithBlockchain(
    paymentId: number,
  ): Promise<PaymentWithBlockchainResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    // Fetch blockchain record if it exists
    const blockchainRecord = await this.blockchainRepository.findOne({
      where: { paymentId },
    });

    return this.formatPaymentResponse(payment, blockchainRecord || undefined);
  }

  // =========================================================
  // READ: List all payments with pagination
  // =========================================================

  /**
   * Lists all payments with pagination and optional blockchain data.
   *
   * @param pagination - Page and limit parameters
   * @returns Paginated list of payments
   */
  async listPayments(
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<PaymentWithBlockchainResponseDto>> {
    const [payments, totalItems] = await this.paymentRepository.findAndCount({
      skip: pagination.offset,
      take: pagination.limit,
      order: { paymentId: 'DESC' },
    });

    // Fetch blockchain records for these payments
    const paymentIds = payments.map((p) => p.paymentId);
    let blockchainRecords: PaymentBlockchain[] = [];

    if (paymentIds.length > 0) {
      blockchainRecords = await this.blockchainRepository
        .createQueryBuilder('pb')
        .where('pb.payment_id IN (:...ids)', { ids: paymentIds })
        .getMany();
    }

    // Create a map for quick lookups
    const blockchainMap = new Map<number, PaymentBlockchain>();
    blockchainRecords.forEach((r) => blockchainMap.set(r.paymentId, r));

    // Format response items
    const items = payments.map((payment) =>
      this.formatPaymentResponse(payment, blockchainMap.get(payment.paymentId)),
    );

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: pagination.limit,
        totalPages: Math.ceil(totalItems / pagination.limit),
        currentPage: pagination.page,
      },
    };
  }

  // =========================================================
  // READ: Get blockchain details only
  // =========================================================

  /**
   * Retrieves only the blockchain record for a given payment ID.
   *
   * @param paymentId - The Sakila payment_id
   * @returns Blockchain record details
   */
  async getBlockchainDetails(paymentId: number): Promise<PaymentBlockchain> {
    const record = await this.blockchainRepository.findOne({
      where: { paymentId },
    });

    if (!record) {
      throw new NotFoundException(
        `No blockchain record found for payment ID ${paymentId}`,
      );
    }

    return record;
  }

  // =========================================================
  // UPDATE: Payment blockchain status
  // =========================================================

  /**
   * Updates the blockchain transaction status for a payment.
   *
   * @param paymentId - The Sakila payment_id
   * @param dto - New status data
   * @returns Updated blockchain record
   */
  async updatePaymentStatus(
    paymentId: number,
    dto: UpdatePaymentStatusDto,
  ): Promise<PaymentBlockchain> {
    const record = await this.blockchainRepository.findOne({
      where: { paymentId },
    });

    if (!record) {
      throw new NotFoundException(
        `No blockchain record found for payment ID ${paymentId}`,
      );
    }

    record.transactionStatus = dto.status;
    return this.blockchainRepository.save(record);
  }

  // =========================================================
  // UTILITY: Get all pending transactions
  // =========================================================

  /**
   * Retrieves all blockchain records with PENDING status.
   * Used by the sync service for batch verification.
   *
   * @returns Array of pending blockchain records
   */
  async getPendingTransactions(): Promise<PaymentBlockchain[]> {
    return this.blockchainRepository.find({
      where: { transactionStatus: TransactionStatus.PENDING },
    });
  }

  // =========================================================
  // PRIVATE: Format payment response
  // =========================================================

  /**
   * Formats a Payment entity and optional blockchain record
   * into the standard API response shape.
   */
  private formatPaymentResponse(
    payment: Payment,
    blockchain?: PaymentBlockchain,
  ): PaymentWithBlockchainResponseDto {
    return {
      paymentId: payment.paymentId,
      customerId: payment.customerId,
      staffId: payment.staffId,
      rentalId: payment.rentalId,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      blockchain: blockchain
        ? {
            txHash: blockchain.txHash,
            walletAddress: blockchain.walletAddress,
            contractAddress: blockchain.contractAddress,
            amountEth: blockchain.amountEth,
            gasUsed: blockchain.gasUsed,
            blockNumber: blockchain.blockNumber,
            transactionStatus: blockchain.transactionStatus,
            createdAt: blockchain.createdAt,
          }
        : null,
    };
  }
}
