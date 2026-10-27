-- =============================================================
-- Migration 001: Create payment_blockchain table
-- =============================================================
-- This table extends the Sakila "payment" table by linking
-- each payment to its corresponding Ethereum transaction.
--
-- Design Decision:
--   We create a SEPARATE related table instead of modifying
--   the original Sakila schema. This preserves the integrity
--   of the reference database while adding blockchain metadata.
--
-- Relationship:
--   payment_blockchain.payment_id → payment.payment_id (FK)
--   One payment can have one blockchain record (1:1)
--
-- Run: mysql -u root -p sakila < database/migrations/001_create_payment_blockchain.sql
-- =============================================================

USE sakila;

-- Drop if exists (for idempotent migrations)
DROP TABLE IF EXISTS payment_blockchain;

CREATE TABLE payment_blockchain (
    -- Primary key
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Foreign key to Sakila's payment table
    payment_id SMALLINT UNSIGNED NOT NULL,

    -- Ethereum transaction hash (0x + 64 hex chars = 66 chars)
    tx_hash VARCHAR(66) NOT NULL,

    -- Ethereum wallet address of the payer (0x + 40 hex chars = 42 chars)
    wallet_address VARCHAR(42) NOT NULL,

    -- Address of the deployed smart contract
    contract_address VARCHAR(42) DEFAULT NULL,

    -- Payment amount in ETH (up to 18 decimal places for wei precision)
    amount_eth DECIMAL(18, 8) NOT NULL,

    -- Gas used by the transaction
    gas_used BIGINT DEFAULT NULL,

    -- Block number where the transaction was mined
    block_number BIGINT DEFAULT NULL,

    -- Transaction status: tracks the lifecycle of the blockchain payment
    -- PENDING  → Transaction submitted, awaiting confirmation
    -- CONFIRMED → Transaction mined and confirmed on-chain
    -- FAILED   → Transaction reverted or failed
    transaction_status ENUM('PENDING', 'CONFIRMED', 'FAILED') DEFAULT 'PENDING',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT fk_payment_blockchain_payment
        FOREIGN KEY (payment_id) REFERENCES payment(payment_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- Each transaction hash must be unique (no duplicate blockchain records)
    CONSTRAINT uk_tx_hash UNIQUE (tx_hash),

    -- Index for efficient status queries
    INDEX idx_transaction_status (transaction_status),

    -- Index for wallet-based lookups
    INDEX idx_wallet_address (wallet_address)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Blockchain payment records linked to Sakila payment table';
