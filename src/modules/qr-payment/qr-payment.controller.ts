/**
 * =============================================================
 * QR Payment Controller
 * =============================================================
 * REST API endpoints for QR-based payment operations:
 *   - POST /qr-payments/generate  → Generate a new QR code
 *   - GET  /qr-payments/:id       → Retrieve QR request details
 *   - GET  /qr-payments/:id/status → Check payment status
 *   - POST /qr-payments/:id/cancel → Cancel a QR request
 * =============================================================
 */
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { QrPaymentService } from './qr-payment.service';
import { CreateQrPaymentDto } from './dto/qr-payment.dto';

@ApiTags('Pagos QR')
@Controller('qr-payments')
export class QrPaymentController {
  constructor(private readonly qrPaymentService: QrPaymentService) {}

  // ─── GENERATE QR ─────────────────────────────────────────

  @Post('generate')
  @ApiOperation({
    summary: 'Generar un código QR para un pago en Ethereum',
    description:
      'Crea una URI de pago compatible con EIP-681 y la codifica como código QR. ' +
      'El QR puede ser escaneado por MetaMask móvil para iniciar un pago. ' +
      'Devuelve la imagen QR como una URI de datos en base64.',
  })
  @ApiResponse({
    status: 201,
    description: 'Código QR generado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  async generateQR(@Body() dto: CreateQrPaymentDto) {
    return this.qrPaymentService.generatePaymentQR(dto);
  }

  // ─── GET QR DETAILS ──────────────────────────────────────

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalles de la solicitud de pago QR',
    description:
      'Recupera la solicitud de pago QR completa incluyendo la imagen QR en base64, ' +
      'la URI EIP-681, el estado y el tiempo de expiración.',
  })
  @ApiParam({ name: 'id', description: 'ID de la solicitud QR', type: Number })
  @ApiResponse({ status: 200, description: 'Solicitud QR encontrada' })
  @ApiResponse({ status: 404, description: 'Solicitud QR no encontrada' })
  async getQrPayment(@Param('id', ParseIntPipe) id: number) {
    return this.qrPaymentService.getQrPayment(id);
  }

  // ─── CHECK STATUS ────────────────────────────────────────

  @Get(':id/status')
  @ApiOperation({
    summary: 'Consultar estado del pago QR',
    description:
      'Devuelve el estado actual de la solicitud de pago QR: ' +
      'PENDIENTE, COMPLETADO, EXPIRADO o CANCELADO.',
  })
  @ApiParam({ name: 'id', description: 'ID de la solicitud QR', type: Number })
  @ApiResponse({ status: 200, description: 'Estado recuperado' })
  @ApiResponse({ status: 404, description: 'Solicitud QR no encontrada' })
  async getQrStatus(@Param('id', ParseIntPipe) id: number) {
    return this.qrPaymentService.getQrPaymentStatus(id);
  }

  // ─── CANCEL QR ───────────────────────────────────────────

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar una solicitud de pago QR',
    description: 'Marca una solicitud de pago QR pendiente como cancelada.',
  })
  @ApiParam({ name: 'id', description: 'ID de la solicitud QR', type: Number })
  @ApiResponse({ status: 200, description: 'Solicitud QR cancelada' })
  @ApiResponse({ status: 404, description: 'Solicitud QR no encontrada' })
  async cancelQrPayment(@Param('id', ParseIntPipe) id: number) {
    return this.qrPaymentService.cancelQrPayment(id);
  }
}
