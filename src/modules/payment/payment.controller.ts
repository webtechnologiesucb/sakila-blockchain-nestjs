/**
 * =============================================================
 * Payment Controller
 * =============================================================
 * REST API endpoints for payment operations:
 *   - POST   /payments        → Create payment + blockchain tx
 *   - GET    /payments        → List payments (paginated)
 *   - GET    /payments/:id    → Get payment with blockchain data
 *   - GET    /payments/:id/blockchain → Get blockchain details
 *   - PATCH  /payments/:id/status     → Update blockchain status
 *
 * All endpoints are documented via Swagger decorators.
 * =============================================================
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import {
  CreateBlockchainPaymentDto,
  UpdatePaymentStatusDto,
} from './dto/payment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Pagos')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // ─── CREATE ──────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo pago con registro en blockchain',
    description:
      'Crea un registro de pago en Sakila Y envía una transacción de Ethereum ' +
      'a través del contrato inteligente PaymentProcessor. El hash de la transacción ' +
      'se almacena en la tabla payment_blockchain.',
  })
  @ApiResponse({ status: 201, description: 'Pago creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 500, description: 'La transacción blockchain falló' })
  async createPayment(@Body() dto: CreateBlockchainPaymentDto) {
    return this.paymentService.createBlockchainPayment(dto);
  }

  // ─── LIST ────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Listar todos los pagos con paginación',
    description:
      'Devuelve una lista paginada de pagos de Sakila con sus datos de ' +
      'transacción blockchain asociados (si están disponibles).',
  })
  @ApiResponse({ status: 200, description: 'Lista de pagos paginada' })
  async listPayments(@Query() pagination: PaginationDto) {
    return this.paymentService.listPayments(pagination);
  }

  // ─── GET SINGLE ──────────────────────────────────────────

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un pago por ID con datos de blockchain',
    description:
      'Recupera un pago individual de Sakila y su registro de transacción ' +
      'blockchain asociado.',
  })
  @ApiParam({ name: 'id', description: 'payment_id de Sakila', type: Number })
  @ApiResponse({ status: 200, description: 'Pago encontrado' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  async getPayment(@Param('id', ParseIntPipe) id: number) {
    return this.paymentService.getPaymentWithBlockchain(id);
  }

  // ─── GET BLOCKCHAIN DETAILS ──────────────────────────────

  @Get(':id/blockchain')
  @ApiOperation({
    summary: 'Obtener detalles de blockchain para un pago',
    description:
      'Devuelve únicamente los datos de la transacción blockchain (tx_hash, wallet, ' +
      'estado, gas, número de bloque) para un pago específico.',
  })
  @ApiParam({ name: 'id', description: 'payment_id de Sakila', type: Number })
  @ApiResponse({ status: 200, description: 'Registro blockchain encontrado' })
  @ApiResponse({ status: 404, description: 'No hay registro blockchain para este pago' })
  async getBlockchainDetails(@Param('id', ParseIntPipe) id: number) {
    return this.paymentService.getBlockchainDetails(id);
  }

  // ─── UPDATE STATUS ───────────────────────────────────────

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Actualizar el estado de la transacción blockchain',
    description:
      'Actualiza el campo transaction_status en payment_blockchain. ' +
      'Transiciones válidas: PENDIENTE → CONFIRMADO, PENDIENTE → FALLIDO.',
  })
  @ApiParam({ name: 'id', description: 'payment_id de Sakila', type: Number })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'No se encontró registro blockchain' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentService.updatePaymentStatus(id, dto);
  }
}
