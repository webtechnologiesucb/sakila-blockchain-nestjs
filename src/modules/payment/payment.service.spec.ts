/**
 * =============================================================
 * Payment Service — Unit Tests
 * =============================================================
 * Tests cover:
 *   - Creating a blockchain payment (success flow)
 *   - Getting a payment with blockchain data
 *   - Listing payments with pagination
 *   - Handling blockchain transaction failures
 *   - Status updates
 *
 * All external dependencies (repositories, blockchain services)
 * are mocked to isolate the service logic.
 * =============================================================
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentService } from './payment.service';
import { Payment } from './entities/payment.entity';
import {
  PaymentBlockchain,
  TransactionStatus,
} from './entities/payment-blockchain.entity';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ContractService } from '../blockchain/contract.service';
import { CreateBlockchainPaymentDto } from './dto/payment.dto';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepo: jest.Mocked<Repository<Payment>>;
  let blockchainRepo: jest.Mocked<Repository<PaymentBlockchain>>;
  let contractService: jest.Mocked<ContractService>;

  // ─── Mock Factory ──────────────────────────────────────
  const mockPaymentRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockBlockchainRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockBlockchainService = {
    verifyTransaction: jest.fn(),
    getBalance: jest.fn(),
  };

  const mockContractService = {
    registerPayment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepo,
        },
        {
          provide: getRepositoryToken(PaymentBlockchain),
          useValue: mockBlockchainRepo,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
        {
          provide: ContractService,
          useValue: mockContractService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepo = module.get(getRepositoryToken(Payment));
    blockchainRepo = module.get(getRepositoryToken(PaymentBlockchain));
    contractService = module.get(ContractService);

    // Reset all mocks between tests
    jest.clearAllMocks();
  });

  // =========================================================
  // Test: Service instantiation
  // =========================================================
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================
  // Test: createBlockchainPayment — Success
  // =========================================================
  describe('createBlockchainPayment', () => {
    const dto: CreateBlockchainPaymentDto = {
      customerId: 1,
      staffId: 1,
      rentalId: 100,
      amount: 4.99,
      amountEth: 0.01,
      walletAddress: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
      reference: 'Rental Payment #100',
    };

    it('should create a payment and blockchain record successfully', async () => {
      // Mock: Sakila payment creation
      const mockPayment = {
        paymentId: 42,
        customerId: 1,
        staffId: 1,
        rentalId: 100,
        amount: 4.99,
        paymentDate: new Date(),
      };
      mockPaymentRepo.create.mockReturnValue(mockPayment);
      mockPaymentRepo.save.mockResolvedValue(mockPayment);

      // Mock: Smart contract call
      mockContractService.registerPayment.mockResolvedValue({
        txHash: '0xabc123def456',
        gasUsed: 21000,
        blockNumber: 5,
        contractAddress: '0xContractAddress',
      });

      // Mock: Blockchain record creation
      const mockBlockchainRecord = {
        id: 1,
        paymentId: 42,
        txHash: '0xabc123def456',
        walletAddress: dto.walletAddress,
        contractAddress: '0xContractAddress',
        amountEth: 0.01,
        gasUsed: 21000,
        blockNumber: 5,
        transactionStatus: TransactionStatus.CONFIRMED,
        createdAt: new Date(),
      };
      mockBlockchainRepo.create.mockReturnValue(mockBlockchainRecord);
      mockBlockchainRepo.save.mockResolvedValue(mockBlockchainRecord);

      // Execute
      const result = await service.createBlockchainPayment(dto);

      // Verify
      expect(result.paymentId).toBe(42);
      expect(result.blockchain).not.toBeNull();
      expect(result.blockchain!.txHash).toBe('0xabc123def456');
      expect(result.blockchain!.transactionStatus).toBe(TransactionStatus.CONFIRMED);
      expect(mockPaymentRepo.save).toHaveBeenCalledTimes(1);
      expect(mockBlockchainRepo.save).toHaveBeenCalledTimes(1);
      expect(mockContractService.registerPayment).toHaveBeenCalledWith(
        42,
        'Rental Payment #100',
        0.01,
      );
    });

    it('should handle blockchain failure and save FAILED record', async () => {
      // Mock: Sakila payment creation succeeds
      const mockPayment = {
        paymentId: 43,
        customerId: 1,
        staffId: 1,
        rentalId: 100,
        amount: 4.99,
        paymentDate: new Date(),
      };
      mockPaymentRepo.create.mockReturnValue(mockPayment);
      mockPaymentRepo.save.mockResolvedValue(mockPayment);

      // Mock: Smart contract call FAILS
      mockContractService.registerPayment.mockRejectedValue(
        new Error('Ganache not running'),
      );

      // Mock: Failed blockchain record
      const failedRecord = {
        id: 2,
        paymentId: 43,
        txHash: expect.stringContaining('FAILED_'),
        transactionStatus: TransactionStatus.FAILED,
      };
      mockBlockchainRepo.create.mockReturnValue(failedRecord);
      mockBlockchainRepo.save.mockResolvedValue(failedRecord);

      // Execute & verify
      await expect(service.createBlockchainPayment(dto)).rejects.toThrow(
        InternalServerErrorException,
      );

      // Should still save the failed record
      expect(mockBlockchainRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================
  // Test: getPaymentWithBlockchain
  // =========================================================
  describe('getPaymentWithBlockchain', () => {
    it('should return payment with blockchain data', async () => {
      const mockPayment = {
        paymentId: 1,
        customerId: 1,
        staffId: 1,
        rentalId: null,
        amount: 2.99,
        paymentDate: new Date(),
      };
      const mockBlockchain = {
        txHash: '0xdef789',
        walletAddress: '0xWallet',
        contractAddress: null,
        amountEth: 0.005,
        gasUsed: 21000,
        blockNumber: 10,
        transactionStatus: TransactionStatus.CONFIRMED,
        createdAt: new Date(),
      };

      mockPaymentRepo.findOne.mockResolvedValue(mockPayment);
      mockBlockchainRepo.findOne.mockResolvedValue(mockBlockchain);

      const result = await service.getPaymentWithBlockchain(1);

      expect(result.paymentId).toBe(1);
      expect(result.blockchain).not.toBeNull();
      expect(result.blockchain!.txHash).toBe('0xdef789');
    });

    it('should throw NotFoundException for non-existent payment', async () => {
      mockPaymentRepo.findOne.mockResolvedValue(null);

      await expect(service.getPaymentWithBlockchain(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return null blockchain when no record exists', async () => {
      const mockPayment = {
        paymentId: 2,
        customerId: 1,
        staffId: 1,
        rentalId: null,
        amount: 1.99,
        paymentDate: new Date(),
      };

      mockPaymentRepo.findOne.mockResolvedValue(mockPayment);
      mockBlockchainRepo.findOne.mockResolvedValue(null);

      const result = await service.getPaymentWithBlockchain(2);

      expect(result.paymentId).toBe(2);
      expect(result.blockchain).toBeNull();
    });
  });

  // =========================================================
  // Test: updatePaymentStatus
  // =========================================================
  describe('updatePaymentStatus', () => {
    it('should update status successfully', async () => {
      const mockRecord = {
        id: 1,
        paymentId: 1,
        transactionStatus: TransactionStatus.PENDING,
      };

      mockBlockchainRepo.findOne.mockResolvedValue(mockRecord);
      mockBlockchainRepo.save.mockResolvedValue({
        ...mockRecord,
        transactionStatus: TransactionStatus.CONFIRMED,
      });

      const result = await service.updatePaymentStatus(1, {
        status: TransactionStatus.CONFIRMED,
      });

      expect(result.transactionStatus).toBe(TransactionStatus.CONFIRMED);
    });

    it('should throw NotFoundException for missing record', async () => {
      mockBlockchainRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updatePaymentStatus(999, {
          status: TransactionStatus.CONFIRMED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================
  // Test: getPendingTransactions
  // =========================================================
  describe('getPendingTransactions', () => {
    it('should return all pending transactions', async () => {
      const pendingRecords = [
        { id: 1, transactionStatus: TransactionStatus.PENDING },
        { id: 2, transactionStatus: TransactionStatus.PENDING },
      ];

      mockBlockchainRepo.find.mockResolvedValue(pendingRecords);

      const result = await service.getPendingTransactions();

      expect(result).toHaveLength(2);
      expect(mockBlockchainRepo.find).toHaveBeenCalledWith({
        where: { transactionStatus: TransactionStatus.PENDING },
      });
    });
  });
});
