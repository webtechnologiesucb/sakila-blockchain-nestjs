-- =============================================================
-- Migration 001: Create payment_blockchain table (PostgreSQL)
-- =============================================================
-- This table extends the Sakila "payment" table by linking
-- each payment to its corresponding Ethereum transaction.
--
-- Run: psql -U postgres -d sakila -f database/migrations/postgres/001_create_payment_blockchain.sql
-- =============================================================

DROP TABLE IF EXISTS payment_blockchain CASCADE;

CREATE TABLE payment_blockchain (
    id SERIAL PRIMARY KEY,
    payment_id INT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    contract_address VARCHAR(42) DEFAULT NULL,
    amount_eth DECIMAL(18, 8) NOT NULL,
    gas_used BIGINT DEFAULT NULL,
    block_number BIGINT DEFAULT NULL,
    transaction_status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_blockchain_payment
        FOREIGN KEY (payment_id) REFERENCES payment(payment_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT uk_tx_hash UNIQUE (tx_hash)
);

CREATE INDEX IF NOT EXISTS idx_payment_blockchain_status ON payment_blockchain (transaction_status);
CREATE INDEX IF NOT EXISTS idx_payment_blockchain_wallet ON payment_blockchain (wallet_address);
