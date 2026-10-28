-- =============================================================
-- Migration 002: Create qr_payment_requests table (PostgreSQL)
-- =============================================================

CREATE TABLE IF NOT EXISTS qr_payment_requests (
    id SERIAL PRIMARY KEY,
    payment_id INT DEFAULT NULL,
    recipient_address VARCHAR(42) NOT NULL,
    amount_eth DECIMAL(18, 8) NOT NULL,
    reference VARCHAR(255) NOT NULL,
    eip681_uri TEXT NOT NULL,
    qr_image_base64 TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    tx_hash VARCHAR(66) DEFAULT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_qr_payment
        FOREIGN KEY (payment_id) REFERENCES payment(payment_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qr_status ON qr_payment_requests (status);
CREATE INDEX IF NOT EXISTS idx_qr_expires ON qr_payment_requests (expires_at);
