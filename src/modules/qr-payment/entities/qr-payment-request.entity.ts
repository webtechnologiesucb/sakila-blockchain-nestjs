/**
 * =============================================================
 * QR Payment Request Entity
 * =============================================================
 * Maps to the `qr_payment_requests` table. Stores generated
 * QR codes for EIP-681 payment URIs that can be scanned by
 * MetaMask or compatible Ethereum wallets.
 * =============================================================
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * QR request lifecycle status
 */
export enum QrStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity({ name: 'qr_payment_requests' })
export class QrPaymentRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'payment_id', type: 'int', nullable: true })
  paymentId: number | null;

  @Column({ name: 'recipient_address', type: 'varchar', length: 42 })
  recipientAddress: string;

  @Column({ name: 'amount_eth', type: 'decimal', precision: 18, scale: 8 })
  amountEth: number;

  @Column({ name: 'reference', type: 'varchar', length: 255 })
  reference: string;

  @Column({ name: 'eip681_uri', type: 'text' })
  eip681Uri: string;

  @Column({ name: 'qr_image_base64', type: 'text' })
  qrImageBase64: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: QrStatus,
    default: QrStatus.PENDING,
  })
  status: QrStatus;

  @Column({ name: 'tx_hash', type: 'varchar', length: 66, nullable: true })
  txHash: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
