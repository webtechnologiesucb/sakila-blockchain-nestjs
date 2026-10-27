/**
 * =============================================================
 * Blockchain Service — Unit Tests
 * =============================================================
 * Tests cover:
 *   - Service initialization
 *   - Transaction verification (CONFIRMED, PENDING, FAILED)
 *   - Balance queries
 *   - Network status
 *
 * The ethers.js provider is mocked to avoid requiring a
 * running Ganache instance during unit tests.
 * =============================================================
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';

describe('BlockchainService', () => {
  let service: BlockchainService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        GANACHE_RPC_URL: 'http://127.0.0.1:7545',
        DEPLOYER_PRIVATE_KEY:
          '0xa473ac71bac13c808d2550e6a08eb63c0cb560b5174c1d8b49911d9c51c9cf23',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BlockchainService>(BlockchainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================
  // Test: verifyTransaction — various states
  // =========================================================
  describe('verifyTransaction', () => {
    it('should return FAILED for non-existent transaction', async () => {
      // Mock the provider to return null for getTransaction
      const mockProvider = {
        getTransaction: jest.fn().mockResolvedValue(null),
        getTransactionReceipt: jest.fn().mockResolvedValue(null),
        getBlockNumber: jest.fn().mockResolvedValue(100),
        getNetwork: jest.fn().mockResolvedValue({ chainId: 1337n, name: 'unknown' }),
        getFeeData: jest.fn().mockResolvedValue({ gasPrice: 20000000000n }),
        getBalance: jest.fn().mockResolvedValue(1000000000000000000n),
      };

      // Inject mock provider via reflection
      (service as any).provider = mockProvider;

      const result = await service.verifyTransaction('0xnonexistent');

      expect(result.status).toBe('FAILED');
      expect(result.txHash).toBe('0xnonexistent');
    });

    it('should return PENDING for unmined transaction', async () => {
      const mockProvider = {
        getTransaction: jest.fn().mockResolvedValue({
          hash: '0xpending123',
          from: '0xFromAddress',
          to: '0xToAddress',
          value: 10000000000000000n, // 0.01 ETH
        }),
        getTransactionReceipt: jest.fn().mockResolvedValue(null),
        getBlockNumber: jest.fn().mockResolvedValue(100),
      };

      (service as any).provider = mockProvider;

      const result = await service.verifyTransaction('0xpending123');

      expect(result.status).toBe('PENDING');
      expect(result.from).toBe('0xFromAddress');
    });

    it('should return CONFIRMED for mined transaction', async () => {
      const mockProvider = {
        getTransaction: jest.fn().mockResolvedValue({
          hash: '0xconfirmed456',
          from: '0xFromAddress',
          to: '0xToAddress',
          value: 10000000000000000n,
        }),
        getTransactionReceipt: jest.fn().mockResolvedValue({
          hash: '0xconfirmed456',
          status: 1,
          blockNumber: 95,
          gasUsed: 21000n,
          from: '0xFromAddress',
          to: '0xToAddress',
        }),
        getBlockNumber: jest.fn().mockResolvedValue(100),
      };

      (service as any).provider = mockProvider;

      const result = await service.verifyTransaction('0xconfirmed456');

      expect(result.status).toBe('CONFIRMED');
      expect(result.blockNumber).toBe(95);
      expect(result.gasUsed).toBe(21000);
      expect(result.confirmations).toBe(6);
    });

    it('should return FAILED for reverted transaction', async () => {
      const mockProvider = {
        getTransaction: jest.fn().mockResolvedValue({
          hash: '0xreverted789',
          from: '0xFromAddress',
          to: '0xToAddress',
          value: 10000000000000000n,
        }),
        getTransactionReceipt: jest.fn().mockResolvedValue({
          hash: '0xreverted789',
          status: 0, // Reverted
          blockNumber: 90,
          gasUsed: 21000n,
          from: '0xFromAddress',
          to: '0xToAddress',
        }),
        getBlockNumber: jest.fn().mockResolvedValue(100),
      };

      (service as any).provider = mockProvider;

      const result = await service.verifyTransaction('0xreverted789');

      expect(result.status).toBe('FAILED');
    });
  });

  // =========================================================
  // Test: getBalance
  // =========================================================
  describe('getBalance', () => {
    it('should return balance in ETH', async () => {
      const mockProvider = {
        getBalance: jest.fn().mockResolvedValue(2000000000000000000n), // 2 ETH
      };

      (service as any).provider = mockProvider;

      const balance = await service.getBalance('0xTestAddress');

      expect(balance).toBe('2.0');
    });
  });

  // =========================================================
  // Test: getNetworkStatus
  // =========================================================
  describe('getNetworkStatus', () => {
    it('should return connected status when provider is available', async () => {
      const mockProvider = {
        getNetwork: jest.fn().mockResolvedValue({
          chainId: 1337n,
          name: 'unknown',
        }),
        getBlockNumber: jest.fn().mockResolvedValue(42),
        getFeeData: jest.fn().mockResolvedValue({
          gasPrice: 20000000000n, // 20 Gwei
        }),
      };

      (service as any).provider = mockProvider;

      const status = await service.getNetworkStatus();

      expect(status.connected).toBe(true);
      expect(status.chainId).toBe(1337);
      expect(status.blockNumber).toBe(42);
    });

    it('should return disconnected status on error', async () => {
      (service as any).provider = {
        getNetwork: jest.fn().mockRejectedValue(new Error('Connection refused')),
      };

      const status = await service.getNetworkStatus();

      expect(status.connected).toBe(false);
    });
  });
});
