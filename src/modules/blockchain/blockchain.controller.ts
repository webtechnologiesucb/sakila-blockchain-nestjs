/**
 * =============================================================
 * Blockchain Controller
 * =============================================================
 * REST API endpoints for direct blockchain interactions:
 *   - GET  /blockchain/status              → Network status
 *   - GET  /blockchain/balance/:address    → Wallet balance
 *   - GET  /blockchain/transaction/:txHash → Transaction details
 *   - POST /blockchain/verify/:txHash      → Verify & get status
 *   - GET  /blockchain/contract/info       → Contract information
 * =============================================================
 */
import {
  Controller,
  Get,
  Post,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { BlockchainService } from './blockchain.service';
import { ContractService } from './contract.service';

@ApiTags('Blockchain')
@Controller('blockchain')
export class BlockchainController {
  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly contractService: ContractService,
  ) {}

  // ─── NETWORK STATUS ──────────────────────────────────────

  @Get('status')
  @ApiOperation({
    summary: 'Obtener estado de la red blockchain',
    description:
      'Devuelve el estado de conectividad, ID de cadena, número de bloque actual ' +
      'y precio del gas del nodo Ethereum conectado (Ganache).',
  })
  @ApiResponse({ status: 200, description: 'Estado de la red obtenido' })
  async getNetworkStatus() {
    return this.blockchainService.getNetworkStatus();
  }

  // ─── WALLET BALANCE ──────────────────────────────────────

  @Get('balance/:address')
  @ApiOperation({
    summary: 'Obtener saldo en ETH de una dirección',
    description: 'Consulta el nodo Ethereum para obtener el saldo de la dirección proporcionada.',
  })
  @ApiParam({
    name: 'address',
    description: 'Dirección Ethereum (0x...)',
    example: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
  })
  @ApiResponse({ status: 200, description: 'Saldo devuelto en ETH' })
  async getBalance(@Param('address') address: string) {
    const balance = await this.blockchainService.getBalance(address);
    return { address, balanceEth: balance };
  }

  // ─── TRANSACTION DETAILS ─────────────────────────────────

  @Get('transaction/:txHash')
  @ApiOperation({
    summary: 'Obtener detalles de una transacción por hash',
    description:
      'Obtiene los datos y recibo de la transacción desde la blockchain. ' +
      'Devuelve el estado (CONFIRMADO, PENDIENTE, FALLIDO), gas utilizado, número de bloque, etc.',
  })
  @ApiParam({
    name: 'txHash',
    description: 'Hash de la transacción (0x...)',
    example: '0x1234567890abcdef...',
  })
  @ApiResponse({ status: 200, description: 'Detalles de la transacción devueltos' })
  async getTransaction(@Param('txHash') txHash: string) {
    return this.blockchainService.verifyTransaction(txHash);
  }

  // ─── VERIFY TRANSACTION ──────────────────────────────────

  @Post('verify/:txHash')
  @ApiOperation({
    summary: 'Verificar una transacción y devolver su estado',
    description:
      'Verifica una transacción blockchain comprobando su recibo. ' +
      'Devuelve CONFIRMADO si fue minada exitosamente, FALLIDO si fue revertida, ' +
      'o PENDIENTE si aún no ha sido minada.',
  })
  @ApiParam({
    name: 'txHash',
    description: 'Hash de la transacción a verificar',
  })
  @ApiResponse({ status: 200, description: 'Resultado de la verificación' })
  async verifyTransaction(@Param('txHash') txHash: string) {
    return this.blockchainService.verifyTransaction(txHash);
  }

  // ─── CONTRACT INFO ───────────────────────────────────────

  @Get('contract/info')
  @ApiOperation({
    summary: 'Obtener información del contrato desplegado',
    description:
      'Devuelve la dirección del contrato, total de pagos registrados ' +
      'y el saldo en ETH del contrato.',
  })
  @ApiResponse({ status: 200, description: 'Información del contrato' })
  async getContractInfo() {
    const [totalPayments, contractBalance] = await Promise.all([
      this.contractService.getTotalPayments(),
      this.contractService.getContractBalance(),
    ]);

    return {
      contractAddress: this.contractService.getContractAddress(),
      totalPayments,
      contractBalanceEth: contractBalance,
    };
  }
}
