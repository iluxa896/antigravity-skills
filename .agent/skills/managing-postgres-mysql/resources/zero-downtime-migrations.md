# Zero-Downtime Migration Patterns (PostgreSQL & MySQL)

This guide details techniques to perform schema changes on high-traffic production databases without causing locking outages or blocking application queries.

---

## 1. PostgreSQL Safe DDL Rules

### Rule A: Concurrent Index Creation
Creating an index normally (`CREATE INDEX`) acquires an `SHARE` lock that blocks all table writes until completion.

- **Safe Approach**:
  ```sql
  -- Always set lock timeout first
  SET lock_timeout = '5s';
  
  -- Create index concurrently without blocking writes
  CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
  ```
- **Validation**:
  Check if index build succeeded. If interrupted, the index will be marked `INVALID`:
  ```sql
  SELECT indexrelid::regclass, indisvalid FROM pg_index WHERE NOT indisvalid;
  ```
  If invalid, drop concurrently (`DROP INDEX CONCURRENTLY idx_users_email;`) and retry.

### Rule B: Adding `NOT NULL` Columns
Adding a `NOT NULL` column with a default value used to rewrite the table in older PostgreSQL versions. In PostgreSQL 11+, default values are metadata-only, but adding `NOT NULL` directly still scans the table under an exclusive lock.

- **Safe Multi-Step Approach**:
  1. Add column as nullable:
     ```sql
     ALTER TABLE users ADD COLUMN status VARCHAR(20);
     ```
  2. Add `CHECK` constraint with `NOT VALID` (instant, no full table scan lock):
     ```sql
     ALTER TABLE users ADD CONSTRAINT chk_users_status_not_null CHECK (status IS NOT NULL) NOT VALID;
     ```
  3. Validate constraint asynchronously:
     ```sql
     ALTER TABLE users VALIDATE CONSTRAINT chk_users_status_not_null;
     ```

---

## 2. MySQL / InnoDB Online DDL Rules

### Rule A: Online Index Addition
In MySQL 5.7+ and 8.0+, use explicit online DDL clauses:

```sql
-- Explicitly require INPLACE algorithm and NO locking
ALTER TABLE orders 
  ADD INDEX idx_customer_created (customer_id, created_at), 
  ALGORITHM=INPLACE, 
  LOCK=NONE;
```

### Rule B: Instant Column Addition (MySQL 8.0+)
MySQL 8.0.12+ supports `ALGORITHM=INSTANT` for appending columns to tables:

```sql
ALTER TABLE users 
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1, 
  ALGORITHM=INSTANT;
```

### Rule C: Heavy Alterations via Shadow Tables (`pt-online-schema-change` / `gh-ost`)
For operations that rewrite InnoDB tables (e.g. changing column data types or primary keys), native `ALTER TABLE` will lock writes or cause heavy IO.

- **Tool Recommendation**:
  Use `gh-ost` (triggerless, binlog-based) or `pt-online-schema-change` to create a shadow table, stream changes, swap tables atomically, and drop the old table in small batches.

---

## 3. General Best Practices

1. **Lock Timeout Policy**:
   - Always set session lock timeouts (`SET lock_timeout = '3s';` in Postgres / `SET lock_wait_timeout = 3;` in MySQL).
2. **Batch Large Updates/Deletes**:
   - Never run `UPDATE table SET status = 'old' WHERE ...` across millions of rows at once.
   - Batch operations in chunks of 1,000–10,000 rows with sleep intervals to avoid replication lag and undo log bloat.
