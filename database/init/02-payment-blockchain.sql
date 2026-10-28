-- =============================================================
-- Migration 001: Create payment_blockchain table (PostgreSQL)
-- =============================================================

CREATE TABLE IF NOT EXISTS payment_blockchain (
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
