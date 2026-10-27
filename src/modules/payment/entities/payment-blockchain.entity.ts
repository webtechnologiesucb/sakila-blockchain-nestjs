/**
 * =============================================================
 * PaymentBlockchain Entity
 * =============================================================
 * Maps to the `payment_blockchain` table created by our
 * migration. This table links Sakila payments to their
 * Ethereum blockchain transactions.
 *
 * Relationship: payment_blockchain.payment_id → payment.payment_id
 * =============================================================
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

/**
 * Enum for blockchain transaction status
 */
export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

@Entity({ name: 'payment_blockchain' })
export class PaymentBlockchain {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'payment_id', type: 'int' })
  paymentId: number;

  @Column({ name: 'tx_hash', type: 'varchar', length: 66 })
  txHash: string;

  @Column({ name: 'wallet_address', type: 'varchar', length: 42 })
  walletAddress: string;

  @Column({ name: 'contract_address', type: 'varchar', length: 42, nullable: true })
  contractAddress: string | null;

  @Column({ name: 'amount_eth', type: 'decimal', precision: 18, scale: 8 })
  amountEth: number;

  @Column({ name: 'gas_used', type: 'bigint', nullable: true })
  gasUsed: number | null;

  @Column({ name: 'block_number', type: 'bigint', nullable: true })
  blockNumber: number | null;

  @Column({
    name: 'transaction_status',
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  transactionStatus: TransactionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ─── Relation to Sakila payment ────────────────────────
  @OneToOne(() => Payment, (payment) => payment.blockchainRecord)
  @JoinColumn({ name: 'payment_id', referencedColumnName: 'paymentId' })
  payment: Payment;
}
