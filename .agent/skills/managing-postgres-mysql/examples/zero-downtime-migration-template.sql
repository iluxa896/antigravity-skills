-- =============================================================================
-- Zero-Downtime Migration Pattern: Adding / Modifying Columns in High-Traffic Tables
-- PostgreSQL (14+) & MySQL (8.0+) Compatible Methodology
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1: Set Aggressive Lock Timeout to Prevent Cascade Connection Starvation
-- -----------------------------------------------------------------------------
-- If PostgreSQL cannot acquire the lock within 3 seconds due to active queries,
-- it will fail immediately rather than queueing behind them and blocking reads.
SET lock_timeout = '3s';
SET statement_timeout = '30s';

-- -----------------------------------------------------------------------------
-- Step 2: Add New Column as Nullable (O(1) Metadata-Only Operation)
-- -----------------------------------------------------------------------------
-- Adding a column with a default in Postgres 11+ and MySQL 8.0 (INSTANT) is instant.
ALTER TABLE customers 
    ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(32) DEFAULT 'STANDARD';

-- -----------------------------------------------------------------------------
-- Step 3: Create Index Concurrently Without Blocking Writes
-- -----------------------------------------------------------------------------
-- Standard CREATE INDEX acquires ACCESS EXCLUSIVE lock. CONCURRENTLY acquires
-- SHARE UPDATE EXCLUSIVE lock, permitting continuous concurrent SELECT/INSERT/UPDATE.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_loyalty_tier
    ON customers (loyalty_tier);

-- -----------------------------------------------------------------------------
-- Step 4: Batch Backfill Historical Data in Chunks (Avoid Long Transactions)
-- -----------------------------------------------------------------------------
-- Never execute: UPDATE customers SET loyalty_tier = 'STANDARD'; (locks entire table)
-- Instead, iterate in 5,000-row batches:
DO $$
DECLARE
    rows_updated INT := 1;
BEGIN
    WHILE rows_updated > 0 LOOP
        UPDATE customers
        SET loyalty_tier = 'STANDARD'
        WHERE id IN (
            SELECT id FROM customers
            WHERE loyalty_tier IS NULL
            LIMIT 5000
        );
        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        COMMIT; -- Release row locks between batches
        PERFORM pg_sleep(0.05); -- Yield I/O to application queries
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- Step 5: Add NOT NULL Constraint Without Full Table Scan
-- -----------------------------------------------------------------------------
-- Phase A: Add constraint with NOT VALID (instant metadata update, no scan)
ALTER TABLE customers 
    ADD CONSTRAINT chk_customers_loyalty_tier_not_null 
    CHECK (loyalty_tier IS NOT NULL) NOT VALID;

-- Phase B: Validate constraint asynchronously (acquires SHARE UPDATE EXCLUSIVE, no blocking)
ALTER TABLE customers 
    VALIDATE CONSTRAINT chk_customers_loyalty_tier_not_null;
