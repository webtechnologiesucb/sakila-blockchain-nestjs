/**
 * =============================================================
 * Sync Controller
 * =============================================================
 * REST endpoints for manual blockchain synchronization:
 *   - POST /sync/trigger          → Trigger manual sync
 *   - GET  /sync/reconciliation   → Get reconciliation report
 * =============================================================
 */
import { Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SyncService } from './sync.service';

@ApiTags('Sincronización')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('trigger')
  @ApiOperation({
    summary: 'Ejecutar sincronización manual de blockchain',
    description:
      'Ejecuta manualmente una sincronización de todas las transacciones ' +
      'blockchain en estado PENDIENTE. Verifica cada tx_hash en la cadena ' +
      'y actualiza el estado a CONFIRMADO o FALLIDO.',
  })
  @ApiResponse({ status: 200, description: 'Sincronización completada' })
  async triggerSync() {
    return this.syncService.syncPendingTransactions();
  }

  @Get('reconciliation')
  @ApiOperation({
    summary: 'Obtener reporte de conciliación de pagos',
    description:
      'Devuelve un resumen de todos los registros blockchain agrupados por estado. ' +
      'Útil para auditar el estado de sincronización entre MySQL y blockchain.',
  })
  @ApiResponse({ status: 200, description: 'Reporte de conciliación' })
  async getReconciliation() {
    return this.syncService.reconcilePayments();
  }
}
