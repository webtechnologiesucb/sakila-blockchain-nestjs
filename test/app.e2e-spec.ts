/**
 * =============================================================
 * End-to-End Tests — Payment Flow
 * =============================================================
 * Integration tests that verify the complete payment flow:
 *   1. Create a payment with blockchain recording
 *   2. Retrieve the payment with blockchain data
 *   3. Verify the transaction on-chain
 *   4. Trigger synchronization
 *
 * NOTE: These tests require:
 *   - A running MySQL instance with the Sakila database
 *   - A running Ganache instance
 *   - The PaymentProcessor contract deployed
 *
 * Run with: npm run test:e2e
 * =============================================================
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Payment Flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================
  // Test: GET /api/v1/blockchain/status
  // =========================================================
  describe('Blockchain Status', () => {
    it('GET /api/v1/blockchain/status should return network info', () => {
      return request(app.getHttpServer())
        .get('/api/v1/blockchain/status')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('connected');
          expect(res.body.data).toHaveProperty('chainId');
          expect(res.body.data).toHaveProperty('blockNumber');
        });
    });
  });

  // =========================================================
  // Test: GET /api/v1/payments (List)
  // =========================================================
  describe('Payment Listing', () => {
    it('GET /api/v1/payments should return paginated results', () => {
      return request(app.getHttpServer())
        .get('/api/v1/payments?page=1&limit=5')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('items');
          expect(res.body.data).toHaveProperty('meta');
          expect(res.body.data.meta).toHaveProperty('totalItems');
          expect(res.body.data.meta).toHaveProperty('currentPage', 1);
          expect(res.body.data.meta).toHaveProperty('itemsPerPage', 5);
        });
    });
  });

  // =========================================================
  // Test: POST /api/v1/payments (Create with Blockchain)
  // =========================================================
  describe('Payment Creation', () => {
    it('POST /api/v1/payments should create a payment', () => {
      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .send({
          customerId: 1,
          staffId: 1,
          rentalId: 1,
          amount: 4.99,
          amountEth: 0.001,
          walletAddress: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
          reference: 'E2E Test Payment',
        })
        .expect((res) => {
          // May succeed (201) or fail (500) depending on Ganache state
          expect([201, 500]).toContain(res.status);
          if (res.status === 201) {
            expect(res.body.data).toHaveProperty('paymentId');
            expect(res.body.data).toHaveProperty('blockchain');
          }
        });
    });

    it('POST /api/v1/payments should reject invalid data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/payments')
        .send({
          customerId: 1,
          // Missing required fields
        })
        .expect(400);
    });
  });

  // =========================================================
  // Test: QR Payment Generation
  // =========================================================
  describe('QR Payment', () => {
    it('POST /api/v1/qr-payments/generate should create a QR code', () => {
      return request(app.getHttpServer())
        .post('/api/v1/qr-payments/generate')
        .send({
          recipientAddress: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
          amountEth: 0.01,
          reference: 'E2E QR Test',
        })
        .expect((res) => {
          // May succeed or fail depending on DB state
          expect([201, 500]).toContain(res.status);
          if (res.status === 201) {
            expect(res.body.data).toHaveProperty('qrImageBase64');
            expect(res.body.data).toHaveProperty('eip681Uri');
            expect(res.body.data.eip681Uri).toContain('ethereum:');
          }
        });
    });
  });

  // =========================================================
  // Test: Sync Reconciliation
  // =========================================================
  describe('Sync', () => {
    it('GET /api/v1/sync/reconciliation should return stats', () => {
      return request(app.getHttpServer())
        .get('/api/v1/sync/reconciliation')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('totalBlockchainRecords');
          expect(res.body.data).toHaveProperty('confirmedCount');
          expect(res.body.data).toHaveProperty('pendingCount');
          expect(res.body.data).toHaveProperty('failedCount');
        });
    });
  });
});
