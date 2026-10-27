/**
 * =============================================================
 * Payment Entity (Sakila payment table)
 * =============================================================
 * Maps to the existing Sakila `payment` table. This entity is
 * READ-ONLY from the perspective of schema changes — we do NOT
 * modify the original Sakila table structure.
 *
 * The payment table records DVD rental payments made by customers.
 * =============================================================
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentBlockchain } from './payment-blockchain.entity';

@Entity({ name: 'payment' })
export class Payment {
  @PrimaryGeneratedColumn({
    name: 'payment_id',
    type: 'int',
  })
  paymentId: number;

  @Column({ name: 'customer_id', type: 'int' })
  customerId: number;

  @Column({ name: 'staff_id', type: 'int' })
  staffId: number;

  @Column({ name: 'rental_id', type: 'int', nullable: true })
  rentalId: number | null;

  @Column({ name: 'amount', type: 'decimal', precision: 5, scale: 2 })
  amount: number;

  @Column({ name: 'payment_date', type: 'timestamp' })
  paymentDate: Date;

  // ─── Relation to blockchain record ─────────────────────
  @OneToOne(() => PaymentBlockchain, (pb) => pb.payment, { eager: false })
  blockchainRecord?: PaymentBlockchain;
}
