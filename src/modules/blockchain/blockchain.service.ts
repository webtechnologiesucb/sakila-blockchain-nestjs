/**
 * =============================================================
 * Blockchain Service (ethers.js Integration)
 * =============================================================
 * Core service for interacting with the Ethereum blockchain
 * via ethers.js v6. Provides:
 *
 *   - Connection to Ganache (local Ethereum node)
 *   - Wallet management (signing transactions)
 *   - Sending raw ETH transactions
 *   - Verifying transaction receipts
 *   - Querying wallet balances and block numbers
 *
 * Design:
 *   This service handles LOW-LEVEL blockchain operations.
 *   Smart contract interactions are delegated to ContractService.
 *
 * Error Handling:
 *   All blockchain operations are wrapped in try/catch blocks
 *   and converted to NestJS-appropriate exceptions.
 * =============================================================
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

/**
 * Interface for transaction verification results
 */
export interface TransactionVerification {
  txHash: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED';
  blockNumber: number | null;
  gasUsed: number | null;
  from: string;
  to: string | null;
  value: string; // In ETH
  confirmations: number;
}

/**
 * Interface for network status information
 */
export interface NetworkStatus {
  connected: boolean;
  networkName: string;
  chainId: number;
  blockNumber: number;
  gasPrice: string; // In Gwei
}

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private deployerWallet: ethers.Wallet;

  constructor(private readonly configService: ConfigService) { }

  /**
   * Initialize the blockchain connection on module startup.
   * Connects to Ganache and verifies connectivity.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
      this.logger.log('✅ Blockchain service initialized successfully');
    } catch (error) {
      this.logger.warn(
        `⚠️ Blockchain connection failed (Ganache may not be running): ${error}`,
      );
    }
  }

  // =========================================================
  // Connection Management
  // =========================================================

  /**
   * Establish a connection to the Ethereum node (Ganache).
   *
   * Creates a JsonRpcProvider pointing to the configured RPC URL
   * and initializes the deployer wallet from the private key.
   */
  async connect(): Promise<void> {
    const rpcUrl = this.configService.get<string>(
      'GANACHE_RPC_URL',
      'http://127.0.0.1:7545',
    );

    this.logger.log(`Connecting to Ethereum node at ${rpcUrl}...`);

    // Create the JSON-RPC provider (ethers.js v6 syntax)
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Initialize the deployer wallet IMMEDIATELY (it's synchronous)
    // This prevents race conditions with services that depend on this wallet
    const privateKey = this.configService.get<string>('DEPLOYER_PRIVATE_KEY');
    if (privateKey) {
      this.deployerWallet = new ethers.Wallet(privateKey, this.provider);
      this.logger.log(`Deployer wallet initialized: ${this.deployerWallet.address}`);
    }

    // Verify connection by fetching the network (async)
    const network = await this.provider.getNetwork();
    this.logger.log(
      `Connected to network: chainId=${network.chainId}`,
    );
  }

  // =========================================================
  // Provider & Wallet Accessors
  // =========================================================

  /**
   * Get the current JSON-RPC provider instance.
   * @returns The ethers.js provider
   */
  getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      throw new InternalServerErrorException(
        'Blockchain provider not initialized. Is Ganache running?',
      );
    }
    return this.provider;
  }

  /**
   * Get the deployer wallet (used for contract deployment and admin tx).
   * @returns The deployer's Wallet instance
   */
  getDeployerWallet(): ethers.Wallet {
    if (!this.deployerWallet) {
      throw new InternalServerErrorException(
        'Deployer wallet not initialized. Check DEPLOYER_PRIVATE_KEY in .env',
      );
    }
    return this.deployerWallet;
  }

  /**
   * Create a Wallet instance from a given private key.
   * Used for customer wallets in testing scenarios.
   *
   * @param privateKey - The private key (hex string with 0x prefix)
   * @returns A connected Wallet instance
   */
  getWallet(privateKey: string): ethers.Wallet {
    return new ethers.Wallet(privateKey, this.getProvider());
  }

  // =========================================================
  // Transaction Operations
  // =========================================================

  /**
   * Send a raw ETH transaction from one address to another.
   *
   * @param to - Recipient address
   * @param amountEth - Amount to send in ETH (as string or number)
   * @returns Transaction receipt with hash, gas, block number
   */
  async sendTransaction(
    to: string,
    amountEth: string | number,
  ): Promise<{
    txHash: string;
    gasUsed: number;
    blockNumber: number;
  }> {
    const wallet = this.getDeployerWallet();

    this.logger.log(
      `Sending ${amountEth} ETH from ${wallet.address} to ${to}`,
    );

    // Build the transaction
    const tx = await wallet.sendTransaction({
      to,
      value: ethers.parseEther(amountEth.toString()),
    });

    this.logger.log(`Transaction submitted: ${tx.hash}`);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();

    if (!receipt) {
      throw new InternalServerErrorException(
        `Transaction ${tx.hash} was not mined`,
      );
    }

    this.logger.log(
      `Transaction mined in block ${receipt.blockNumber}, gas used: ${receipt.gasUsed}`,
    );

    return {
      txHash: receipt.hash,
      gasUsed: Number(receipt.gasUsed),
      blockNumber: receipt.blockNumber,
    };
  }

  // =========================================================
  // Transaction Verification
  // =========================================================

  /**
   * Verify a transaction by its hash. Fetches the transaction
   * and its receipt from the blockchain to determine status.
   *
   * Status logic:
   *   - Receipt exists + status 1 → CONFIRMED
   *   - Receipt exists + status 0 → FAILED (reverted)
   *   - No receipt → PENDING (not yet mined)
   *
   * @param txHash - The transaction hash to verify
   * @returns Verification result with status and details
   */
  async verifyTransaction(txHash: string): Promise<TransactionVerification> {
    const provider = this.getProvider();

    this.logger.log(`Verifying transaction: ${txHash}`);

    // Fetch the transaction object
    const tx = await provider.getTransaction(txHash);

    if (!tx) {
      return {
        txHash,
        status: 'FAILED',
        blockNumber: null,
        gasUsed: null,
        from: '',
        to: null,
        value: '0',
        confirmations: 0,
      };
    }

    // Fetch the receipt (null if not yet mined)
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      // Transaction exists but hasn't been mined yet
      return {
        txHash,
        status: 'PENDING',
        blockNumber: null,
        gasUsed: null,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        confirmations: 0,
      };
    }

    // Transaction has been mined — check status
    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber + 1;

    return {
      txHash,
      status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
      blockNumber: receipt.blockNumber,
      gasUsed: Number(receipt.gasUsed),
      from: receipt.from,
      to: receipt.to,
      value: ethers.formatEther(tx.value),
      confirmations,
    };
  }

  // =========================================================
  // Query Operations
  // =========================================================

  /**
   * Get the ETH balance of an address.
   *
   * @param address - Ethereum address to query
   * @returns Balance in ETH as a string
   */
  async getBalance(address: string): Promise<string> {
    const provider = this.getProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  /**
   * Get the current block number on the network.
   *
   * @returns Current block number
   */
  async getBlockNumber(): Promise<number> {
    const provider = this.getProvider();
    return provider.getBlockNumber();
  }

  /**
   * Get comprehensive network status information.
   *
   * @returns Network status object
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    try {
      const provider = this.getProvider();
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      const feeData = await provider.getFeeData();

      return {
        connected: true,
        networkName: network.name,
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: feeData.gasPrice
          ? ethers.formatUnits(feeData.gasPrice, 'gwei')
          : '0',
      };
    } catch {
      return {
        connected: false,
        networkName: 'unknown',
        chainId: 0,
        blockNumber: 0,
        gasPrice: '0',
      };
    }
  }
}
