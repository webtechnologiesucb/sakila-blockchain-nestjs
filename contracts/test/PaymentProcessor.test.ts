/**
 * =============================================================
 * PaymentProcessor Smart Contract — Unit Tests
 * =============================================================
 * Tests cover:
 *   - Deployment & ownership
 *   - Payment registration (success & failure cases)
 *   - Payment retrieval
 *   - Status updates
 *   - Withdrawal functionality
 *   - Event emission verification
 *
 * Run with: npx hardhat test
 * =============================================================
 */
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { PaymentProcessor } from '../../typechain-types';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';

describe('PaymentProcessor', function () {
  let contract: PaymentProcessor;
  let owner: SignerWithAddress;
  let customer: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  // Deploy a fresh contract before each test
  beforeEach(async function () {
    [owner, customer, otherAccount] = await ethers.getSigners();

    const PaymentProcessorFactory = await ethers.getContractFactory(
      'PaymentProcessor',
    );
    contract = await PaymentProcessorFactory.deploy();
    await contract.waitForDeployment();
  });

  // ==========================================================
  // Deployment Tests
  // ==========================================================
  describe('Deployment', function () {
    it('should set the deployer as owner', async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it('should initialize totalPayments to 0', async function () {
      expect(await contract.totalPayments()).to.equal(0);
    });

    it('should have zero contract balance initially', async function () {
      expect(await contract.getContractBalance()).to.equal(0);
    });
  });

  // ==========================================================
  // Payment Registration Tests
  // ==========================================================
  describe('registerPayment', function () {
    const paymentId = 1;
    const reference = 'Rental Payment #1001';
    const paymentAmount = ethers.parseEther('0.5');

    it('should register a payment successfully', async function () {
      await expect(
        contract.connect(customer).registerPayment(paymentId, reference, {
          value: paymentAmount,
        }),
      )
        .to.emit(contract, 'PaymentRegistered')
        .withArgs(paymentId, customer.address, paymentAmount, reference);

      // Verify storage
      const payment = await contract.getPayment(paymentId);
      expect(payment.paymentId).to.equal(paymentId);
      expect(payment.payer).to.equal(customer.address);
      expect(payment.amount).to.equal(paymentAmount);
      expect(payment.paymentRef).to.equal(reference);
      expect(payment.status).to.equal(1); // CONFIRMED
    });

    it('should increment totalPayments', async function () {
      await contract
        .connect(customer)
        .registerPayment(paymentId, reference, { value: paymentAmount });

      expect(await contract.totalPayments()).to.equal(1);
    });

    it('should update contract balance', async function () {
      await contract
        .connect(customer)
        .registerPayment(paymentId, reference, { value: paymentAmount });

      expect(await contract.getContractBalance()).to.equal(paymentAmount);
    });

    it('should reject payment with 0 ETH', async function () {
      await expect(
        contract
          .connect(customer)
          .registerPayment(paymentId, reference, { value: 0 }),
      ).to.be.revertedWith('PaymentProcessor: payment amount must be > 0');
    });

    it('should reject duplicate payment IDs', async function () {
      await contract
        .connect(customer)
        .registerPayment(paymentId, reference, { value: paymentAmount });

      await expect(
        contract
          .connect(customer)
          .registerPayment(paymentId, reference, { value: paymentAmount }),
      ).to.be.revertedWith('PaymentProcessor: payment already registered');
    });

    it('should reject empty reference', async function () {
      await expect(
        contract
          .connect(customer)
          .registerPayment(paymentId, '', { value: paymentAmount }),
      ).to.be.revertedWith('PaymentProcessor: reference cannot be empty');
    });

    it('should handle multiple different payments', async function () {
      await contract
        .connect(customer)
        .registerPayment(1, 'Payment 1', { value: ethers.parseEther('0.1') });
      await contract
        .connect(customer)
        .registerPayment(2, 'Payment 2', { value: ethers.parseEther('0.2') });
      await contract
        .connect(otherAccount)
        .registerPayment(3, 'Payment 3', {
          value: ethers.parseEther('0.3'),
        });

      expect(await contract.totalPayments()).to.equal(3);
      expect(await contract.getPaymentCount()).to.equal(3);
    });
  });

  // ==========================================================
  // Payment Retrieval Tests
  // ==========================================================
  describe('getPayment', function () {
    it('should return payment details correctly', async function () {
      const amount = ethers.parseEther('1.0');
      await contract
        .connect(customer)
        .registerPayment(42, 'Test Ref', { value: amount });

      const payment = await contract.getPayment(42);
      expect(payment.paymentId).to.equal(42);
      expect(payment.payer).to.equal(customer.address);
      expect(payment.amount).to.equal(amount);
      expect(payment.paymentRef).to.equal('Test Ref');
    });

    it('should revert for non-existent payment', async function () {
      await expect(contract.getPayment(999)).to.be.revertedWith(
        'PaymentProcessor: payment not found',
      );
    });
  });

  // ==========================================================
  // Status Update Tests
  // ==========================================================
  describe('updatePaymentStatus', function () {
    beforeEach(async function () {
      await contract
        .connect(customer)
        .registerPayment(1, 'Test', { value: ethers.parseEther('0.1') });
    });

    it('should allow owner to update status', async function () {
      await expect(contract.connect(owner).updatePaymentStatus(1, 3)) // REFUNDED
        .to.emit(contract, 'PaymentStatusUpdated')
        .withArgs(1, 1, 3); // CONFIRMED -> REFUNDED
    });

    it('should reject status update from non-owner', async function () {
      await expect(
        contract.connect(customer).updatePaymentStatus(1, 2),
      ).to.be.revertedWith('PaymentProcessor: caller is not the owner');
    });

    it('should reject updating to same status', async function () {
      await expect(
        contract.connect(owner).updatePaymentStatus(1, 1),
      ).to.be.revertedWith('PaymentProcessor: status unchanged');
    });
  });

  // ==========================================================
  // Withdrawal Tests
  // ==========================================================
  describe('withdraw', function () {
    it('should allow owner to withdraw funds', async function () {
      const amount = ethers.parseEther('2.0');
      await contract
        .connect(customer)
        .registerPayment(1, 'Test', { value: amount });

      const ownerBalanceBefore = await ethers.provider.getBalance(
        owner.address,
      );

      await expect(contract.connect(owner).withdraw())
        .to.emit(contract, 'FundsWithdrawn')
        .withArgs(owner.address, amount);

      const ownerBalanceAfter = await ethers.provider.getBalance(
        owner.address,
      );
      expect(ownerBalanceAfter).to.be.greaterThan(ownerBalanceBefore);
    });

    it('should reject withdrawal with no funds', async function () {
      await expect(contract.connect(owner).withdraw()).to.be.revertedWith(
        'PaymentProcessor: no funds to withdraw',
      );
    });

    it('should reject withdrawal from non-owner', async function () {
      await contract
        .connect(customer)
        .registerPayment(1, 'Test', { value: ethers.parseEther('1.0') });

      await expect(contract.connect(customer).withdraw()).to.be.revertedWith(
        'PaymentProcessor: caller is not the owner',
      );
    });
  });

  // ==========================================================
  // Utility Tests
  // ==========================================================
  describe('Utility functions', function () {
    it('paymentExists should return correct boolean', async function () {
      expect(await contract.paymentExists(1)).to.equal(false);

      await contract
        .connect(customer)
        .registerPayment(1, 'Test', { value: ethers.parseEther('0.1') });

      expect(await contract.paymentExists(1)).to.equal(true);
    });

    it('should accept direct ETH transfers via receive', async function () {
      await owner.sendTransaction({
        to: await contract.getAddress(),
        value: ethers.parseEther('1.0'),
      });

      expect(await contract.getContractBalance()).to.equal(
        ethers.parseEther('1.0'),
      );
    });
  });
});
