/**
 * =============================================================
 * Payment DTOs (Data Transfer Objects)
 * =============================================================
 * Defines the shape of data for API requests and responses
 * related to payments. Uses class-validator for runtime
 * validation and @nestjs/swagger for automatic documentation.
 * =============================================================
 */
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsEthereumAddress,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionStatus } from '../entities/payment-blockchain.entity';

/**
 * DTO for creating a new payment with blockchain recording
 */
export class CreateBlockchainPaymentDto {
  @ApiProperty({
    description: 'customer_id de Sakila que realiza el pago',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  customerId: number;

  @ApiProperty({
    description: 'staff_id de Sakila que procesa el pago',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  staffId: number;

  @ApiPropertyOptional({
    description: 'rental_id de Sakila asociado al pago',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  rentalId?: number;

  @ApiProperty({
    description: 'Monto del pago en USD (Sakila)',
    example: 4.99,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Monto del pago en ETH para la transacción blockchain',
    example: 0.01,
  })
  @IsNumber()
  @Min(0.000001)
  amountEth: number;

  @ApiProperty({
    description: 'Dirección de wallet Ethereum del pagador',
    example: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiPropertyOptional({
    description: 'Referencia para la transacción blockchain',
    example: 'Pago de Alquiler #1001',
  })
  @IsOptional()
  @IsString()
  reference?: string;
}

/**
 * DTO for updating a payment's blockchain status
 */
export class UpdatePaymentStatusDto {
  @ApiProperty({
    description: 'Nuevo estado de la transacción',
    enum: TransactionStatus,
    example: TransactionStatus.CONFIRMED,
  })
  @IsEnum(TransactionStatus)
  @IsNotEmpty()
  status: TransactionStatus;
}

/**
 * Response DTO for a payment with blockchain data
 */
export class PaymentWithBlockchainResponseDto {
  paymentId: number;
  customerId: number;
  staffId: number;
  rentalId: number | null;
  amount: number;
  paymentDate: Date;
  blockchain: {
    txHash: string;
    walletAddress: string;
    contractAddress: string | null;
    amountEth: number;
    gasUsed: number | null;
    blockNumber: number | null;
    transactionStatus: TransactionStatus;
    createdAt: Date;
  } | null;
}
