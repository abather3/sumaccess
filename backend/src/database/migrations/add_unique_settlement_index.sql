-- Migration to add unique index for preventing duplicate payment settlements
-- This prevents accidental duplicate rows in payment_settlements table

-- Add UNIQUE INDEX on (transaction_id, paid_at, amount, cashier_id)
-- Using a hash-based approach with a constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_settlements_unique_combo
ON payment_settlements (
    transaction_id, 
    date_trunc('second', paid_at),  -- Truncate to seconds to avoid microsecond duplicates
    amount, 
    cashier_id
);

-- Add comment for documentation
COMMENT ON INDEX idx_payment_settlements_unique_combo IS 'Prevents duplicate payment settlements for the same transaction, amount, cashier and timestamp (truncated to seconds)';

-- Alternative approach using a hash-based idempotency key column (optional)
-- This can be uncommented if preferred over the unique index approach

-- ALTER TABLE payment_settlements ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);

-- CREATE OR REPLACE FUNCTION generate_settlement_idempotency_key()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.idempotency_key = encode(
--         sha256(
--             (NEW.transaction_id || ':' || 
--              date_trunc('second', NEW.paid_at)::text || ':' || 
--              NEW.amount::text || ':' || 
--              COALESCE(NEW.cashier_id::text, 'NULL'))::bytea
--         ), 
--         'hex'
--     );
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER IF NOT EXISTS trigger_settlement_idempotency_key
--     BEFORE INSERT OR UPDATE ON payment_settlements
--     FOR EACH ROW EXECUTE FUNCTION generate_settlement_idempotency_key();

-- CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_settlements_idempotency_key 
-- ON payment_settlements(idempotency_key);
