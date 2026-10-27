/**
 * =============================================================
 * Contract Service (Smart Contract Interaction)
 * =============================================================
 * Handles all interactions with the deployed PaymentProcessor
 * smart contract via ethers.js v6.
 *
 * Responsibilities:
 *   - Loading the contract ABI and connecting to the deployed instance
 *   - Calling registerPayment() to record payments on-chain
 *   - Reading payment data from the contract
 *   - Listening for contract events
 *
 * Design:
 *   Separated from BlockchainService to follow SRP:
 *   - BlockchainService: low-level Ethereum operations
 *   - ContractService: smart contract-specific logic
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
import { BlockchainService } from './blockchain.service';

/**
 * Result of a contract payment registration
 */
export interface PaymentRegistrationResult {
  txHash: string;
  gasUsed: number;
  blockNumber: number;
  contractAddress: string;
}

/**
 * Payment data read from the smart contract
 */
export interface ContractPaymentData {
  paymentId: number;
  payer: string;
  amount: string; // In ETH
  reference: string;
  status: number;
  timestamp: number;
}

/**
 * ABI for the PaymentProcessor contract.
 * This is the minimal ABI needed for interaction.
 * In production, this would be loaded from the compiled artifact.
 */
const PAYMENT_PROCESSOR_ABI = [
  // Functions
  'function registerPayment(uint256 _paymentId, string calldata _reference) external payable',
  'function getPayment(uint256 _paymentId) external view returns (uint256 paymentId, address payer, uint256 amount, string memory reference, uint8 status, uint256 timestamp)',
  'function paymentExists(uint256 _paymentId) external view returns (bool)',
  'function getPaymentCount() external view returns (uint256)',
  'function getContractBalance() external view returns (uint256)',
  'function totalPayments() external view returns (uint256)',
  'function owner() external view returns (address)',
  'function updatePaymentStatus(uint256 _paymentId, uint8 _newStatus) external',
  'function withdraw() external',

  // Events
  'event PaymentRegistered(uint256 indexed paymentId, address indexed payer, uint256 amount, string reference)',
  'event PaymentStatusUpdated(uint256 indexed paymentId, uint8 oldStatus, uint8 newStatus)',
  'event FundsWithdrawn(address indexed owner, uint256 amount)',
];

@Injectable()
export class ContractService implements OnModuleInit {
  private readonly logger = new Logger(ContractService.name);
  private contract: ethers.Contract | null = null;
  private contractAddress: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Initialize the contract instance on module startup.
   * If PAYMENT_CONTRACT_ADDRESS is set, connects to it.
   */
  async onModuleInit(): Promise<void> {
    this.contractAddress = this.configService.get<string>(
      'PAYMENT_CONTRACT_ADDRESS',
      '',
    );

    if (this.contractAddress) {
      try {
        await this.initializeContract();
        this.logger.log(
          `✅ Contract service initialized at ${this.contractAddress}`,
        );
      } catch (error) {
        this.logger.warn(
          `⚠️ Failed to connect to contract: ${error}`,
        );
      }
    } else {
      this.logger.warn(
        '⚠️ PAYMENT_CONTRACT_ADDRESS not set. Deploy the contract first.',
      );
    }
  }

  // =========================================================
  // Contract Initialization
  // =========================================================

  /**
   * Initialize the contract instance by connecting to the deployed
   * PaymentProcessor at the configured address.
   */
  private async initializeContract(): Promise<void> {
    const wallet = this.blockchainService.getDeployerWallet();

    this.contract = new ethers.Contract(
      this.contractAddress,
      PAYMENT_PROCESSOR_ABI,
      wallet,
    );

    // Verify the contract exists by calling a view function
    const owner = await this.contract.owner();
    this.logger.log(`Contract owner: ${owner}`);
  }

  /**
   * Get the contract instance, initializing if necessary.
   * @returns The ethers.js Contract instance
   */
  private getContract(): ethers.Contract {
    if (!this.contract) {
      throw new InternalServerErrorException(
        'Smart contract not initialized. Set PAYMENT_CONTRACT_ADDRESS in .env',
      );
    }
    return this.contract;
  }

  // =========================================================
  // Payment Registration
  // =========================================================

  /**
   * Register a payment on the blockchain via the smart contract.
   *
   * Flow:
   * 1. Encode the function call with paymentId and reference
   * 2. Send the transaction with the ETH value
   * 3. Wait for mining and return the receipt details
   *
   * @param paymentId - The Sakila payment_id to register
   * @param reference - Human-readable reference string
   * @param amountEth - Amount to send in ETH
   * @returns Transaction result with hash, gas, block number
   */
  async registerPayment(
    paymentId: number,
    reference: string,
    amountEth: number,
  ): Promise<PaymentRegistrationResult> {
    const contract = this.getContract();

    this.logger.log(
      `Registering payment #${paymentId} on-chain: ${amountEth} ETH`,
    );

    try {
      // Call the smart contract's registerPayment function
      // msg.value is set via the overrides object { value: ... }
      const tx = await contract.registerPayment(
        paymentId,
        reference,
        {
          value: ethers.parseEther(amountEth.toString()),
        },
      );

      this.logger.log(`Transaction submitted: ${tx.hash}`);

      // Wait for the transaction to be mined
      const receipt = await tx.wait();

      this.logger.log(
        `Payment #${paymentId} confirmed in block ${receipt.blockNumber}`,
      );

      return {
        txHash: receipt.hash,
        gasUsed: Number(receipt.gasUsed),
        blockNumber: receipt.blockNumber,
        contractAddress: this.contractAddress,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to register payment #${paymentId}: ${error.message}`,
      );

      // Parse Solidity revert reasons
      if (error.reason) {
        throw new InternalServerErrorException(
          `Contract revert: ${error.reason}`,
        );
      }
      throw new InternalServerErrorException(
        `Blockchain transaction failed: ${error.message}`,
      );
    }
  }

  // =========================================================
  // Payment Queries
  // =========================================================

  /**
   * Read payment data from the smart contract.
   *
   * @param paymentId - The Sakila payment_id to query
   * @returns Payment data from the blockchain
   */
  async getPaymentFromContract(
    paymentId: number,
  ): Promise<ContractPaymentData> {
    const contract = this.getContract();

    try {
      const result = await contract.getPayment(paymentId);

      return {
        paymentId: Number(result[0]),
        payer: result[1],
        amount: ethers.formatEther(result[2]),
        reference: result[3],
        status: Number(result[4]),
        timestamp: Number(result[5]),
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to read payment #${paymentId} from contract: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Contract read failed: ${error.message}`,
      );
    }
  }

  /**
   * Check if a payment exists on the blockchain.
   *
   * @param paymentId - The Sakila payment_id to check
   * @returns True if the payment is registered on-chain
   */
  async paymentExistsOnChain(paymentId: number): Promise<boolean> {
    const contract = this.getContract();

    try {
      return await contract.paymentExists(paymentId);
    } catch {
      return false;
    }
  }

  /**
   * Get the total number of payments registered on-chain.
   *
   * @returns Total payment count
   */
  async getTotalPayments(): Promise<number> {
    const contract = this.getContract();
    const count = await contract.totalPayments();
    return Number(count);
  }

  /**
   * Get the contract's ETH balance.
   *
   * @returns Balance in ETH as a string
   */
  async getContractBalance(): Promise<string> {
    const contract = this.getContract();
    const balance = await contract.getContractBalance();
    return ethers.formatEther(balance);
  }

  // =========================================================
  // Event Listening
  // =========================================================

  /**
   * Set up a real-time listener for PaymentRegistered events.
   * This allows the backend to react to on-chain payments
   * (e.g., from QR code scans) without polling.
   *
   * @param callback - Function called when a payment event is detected
   */
  async listenForPaymentEvents(
    callback: (
      paymentId: number,
      payer: string,
      amount: string,
      reference: string,
      txHash: string,
    ) => void,
  ): Promise<void> {
    const contract = this.getContract();

    contract.on(
      'PaymentRegistered',
      (paymentId, payer, amount, reference, event) => {
        this.logger.log(
          `📡 PaymentRegistered event: #${paymentId} from ${payer}`,
        );
        callback(
          Number(paymentId),
          payer,
          ethers.formatEther(amount),
          reference,
          event.log.transactionHash,
        );
      },
    );

    this.logger.log('👂 Listening for PaymentRegistered events...');
  }

  /**
   * Get the deployed contract address.
   * @returns The contract address
   */
  getContractAddress(): string {
    return this.contractAddress;
  }
}
