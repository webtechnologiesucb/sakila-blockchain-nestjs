/**
 * =============================================================
 * QR Payment Service
 * =============================================================
 * Generates QR codes containing EIP-681 Ethereum payment URIs.
 *
 * EIP-681 Format:
 *   ethereum:<address>[@<chain_id>]?value=<amount_in_wei>
 *
 * Flow:
 *   1. Client requests a QR code for a specific amount
 *   2. Service builds the EIP-681 URI
 *   3. Service generates a QR code image (PNG → base64)
 *   4. Stores the request in the database with expiration
 *   5. Returns the QR image and URI to the client
 *
 * MetaMask Interaction:
 *   When a user scans the QR code with MetaMask mobile:
 *   - MetaMask parses the EIP-681 URI
 *   - Pre-fills the recipient, amount, and chain
 *   - User confirms and signs the transaction
 *   - Transaction is broadcast to the network
 *   - The sync service detects and records the payment
 * =============================================================
 */
import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { ethers } from 'ethers';
import { QrPaymentRequest, QrStatus } from './entities/qr-payment-request.entity';
import { CreateQrPaymentDto } from './dto/qr-payment.dto';

@Injectable()
export class QrPaymentService {
  private readonly logger = new Logger(QrPaymentService.name);

  constructor(
    @InjectRepository(QrPaymentRequest)
    private readonly qrRepository: Repository<QrPaymentRequest>,

    private readonly configService: ConfigService,
  ) {}

  // =========================================================
  // QR Code Generation
  // =========================================================

  /**
   * Generate a QR code for an Ethereum payment request.
   *
   * Steps:
   * 1. Build the EIP-681 URI with recipient, amount, and chain ID
   * 2. Generate a PNG QR code and encode as base64
   * 3. Store the request in the database with expiration
   * 4. Return the complete QR payment request record
   *
   * @param dto - QR generation parameters
   * @returns The created QR payment request with base64 image
   */
  async generatePaymentQR(dto: CreateQrPaymentDto): Promise<QrPaymentRequest> {
    this.logger.log(
      `Generating QR payment: ${dto.amountEth} ETH to ${dto.recipientAddress}`,
    );

    // Step 1: Build the EIP-681 URI
    const chainId = this.configService.get<number>('GANACHE_CHAIN_ID', 1337);
    const amountInWei = ethers.parseEther(dto.amountEth.toString()).toString();

    // EIP-681 format: ethereum:<address>@<chainId>?value=<weiAmount>
    // The @chainId tells MetaMask which network to use
    const eip681Uri = `ethereum:${dto.recipientAddress}@${chainId}?value=${amountInWei}`;

    this.logger.log(`EIP-681 URI: ${eip681Uri}`);

    // Step 2: Generate QR code as base64 PNG
    const qrImageBase64 = await this.generateQRImage(eip681Uri);

    // Step 3: Calculate expiration time
    const expirationMinutes = dto.expirationMinutes ||
      this.configService.get<number>('QR_EXPIRATION_MINUTES', 15);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

    // Step 4: Store in database
    const qrRequest = this.qrRepository.create({
      paymentId: dto.paymentId || null,
      recipientAddress: dto.recipientAddress,
      amountEth: dto.amountEth,
      reference: dto.reference,
      eip681Uri,
      qrImageBase64,
      status: QrStatus.PENDING,
      expiresAt,
    });

    const saved = await this.qrRepository.save(qrRequest);
    this.logger.log(`QR payment request created: ID ${saved.id}`);

    return saved;
  }

  // =========================================================
  // QR Retrieval
  // =========================================================

  /**
   * Retrieve a QR payment request by its ID.
   *
   * @param id - QR request ID
   * @returns The QR payment request record
   */
  async getQrPayment(id: number): Promise<QrPaymentRequest> {
    const qr = await this.qrRepository.findOne({ where: { id } });

    if (!qr) {
      throw new NotFoundException(`QR payment request #${id} not found`);
    }

    // Check if expired
    if (qr.status === QrStatus.PENDING && new Date() > qr.expiresAt) {
      qr.status = QrStatus.EXPIRED;
      await this.qrRepository.save(qr);
    }

    return qr;
  }

  /**
   * Get the status of a QR payment request.
   *
   * @param id - QR request ID
   * @returns Status information
   */
  async getQrPaymentStatus(id: number): Promise<{
    id: number;
    status: QrStatus;
    txHash: string | null;
    expiresAt: Date;
    isExpired: boolean;
  }> {
    const qr = await this.getQrPayment(id);

    return {
      id: qr.id,
      status: qr.status,
      txHash: qr.txHash,
      expiresAt: qr.expiresAt,
      isExpired: new Date() > qr.expiresAt,
    };
  }

  // =========================================================
  // QR Status Updates
  // =========================================================

  /**
   * Mark a QR payment as completed with a transaction hash.
   *
   * @param id - QR request ID
   * @param txHash - The blockchain transaction hash
   */
  async markAsCompleted(id: number, txHash: string): Promise<QrPaymentRequest> {
    const qr = await this.getQrPayment(id);
    qr.status = QrStatus.COMPLETED;
    qr.txHash = txHash;
    return this.qrRepository.save(qr);
  }

  /**
   * Cancel a QR payment request.
   *
   * @param id - QR request ID
   */
  async cancelQrPayment(id: number): Promise<QrPaymentRequest> {
    const qr = await this.getQrPayment(id);
    qr.status = QrStatus.CANCELLED;
    return this.qrRepository.save(qr);
  }

  /**
   * Expire all QR requests that have passed their expiration time.
   * Called by the sync scheduler.
   *
   * @returns Number of expired requests
   */
  async expireOldRequests(): Promise<number> {
    const result = await this.qrRepository.update(
      {
        status: QrStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      { status: QrStatus.EXPIRED },
    );

    return result.affected || 0;
  }

  // =========================================================
  // Private Helpers
  // =========================================================

  /**
   * Generate a QR code image from a string and return as base64.
   *
   * @param data - The string to encode in the QR code
   * @returns Base64-encoded PNG image (data URI format)
   */
  private async generateQRImage(data: string): Promise<string> {
    try {
      // Generate QR code as a data URL (base64 PNG)
      const qrDataUrl = await QRCode.toDataURL(data, {
        type: 'image/png',
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M', // Medium error correction
      });

      return qrDataUrl;
    } catch (error) {
      this.logger.error(`QR generation failed: ${error}`);
      throw error;
    }
  }
}
