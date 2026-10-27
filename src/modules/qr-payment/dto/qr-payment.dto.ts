/**
 * =============================================================
 * QR Payment DTOs
 * =============================================================
 * Data Transfer Objects for QR payment request creation
 * and response formatting.
 * =============================================================
 */
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new QR payment request
 */
export class CreateQrPaymentDto {
  @ApiProperty({
    description: 'Dirección de wallet Ethereum del destinatario (tienda/contrato)',
    example: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
  })
  @IsString()
  @IsNotEmpty()
  recipientAddress: string;

  @ApiProperty({
    description: 'Monto del pago en ETH',
    example: 0.01,
  })
  @IsNumber()
  @Min(0.000001)
  amountEth: number;

  @ApiProperty({
    description: 'Referencia de pago legible',
    example: 'Pago de Alquiler - Cliente John Doe - Película: Academy Dinosaur',
  })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiPropertyOptional({
    description: 'payment_id de Sakila asociado (si ya fue creado)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  paymentId?: number;

  @ApiPropertyOptional({
    description: 'Tiempo de expiración del QR en minutos (por defecto: 15)',
    example: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  expirationMinutes?: number;
}

/**
 * Response DTO for a QR payment request
 */
export class QrPaymentResponseDto {
  id: number;
  recipientAddress: string;
  amountEth: number;
  reference: string;
  eip681Uri: string;
  qrImageBase64: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
}
