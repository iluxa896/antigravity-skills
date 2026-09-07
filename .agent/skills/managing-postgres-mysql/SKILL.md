---
name: managing-postgres-mysql
description: >-
  Provides expert DBA workflows, query tuning, indexing strategies, diagnostic queries,
  and zero-downtime migration guidelines for PostgreSQL and MySQL. Use when analyzing slow queries,
  tuning execution plans (EXPLAIN ANALYZE), resolving deadlocks, configuring connection pooling (pgBouncer),
  auditing migrations for table locks, or optimizing autovacuum and buffer caches.
---

# Managing PostgreSQL & MySQL Databases (DBA Master Skill)

## When to use this skill
- Analyzing slow queries, execution plans (`EXPLAIN`, `EXPLAIN ANALYZE`, `EXPLAIN FORMAT=JSON`).
- Diagnosing deadlocks, lock contention, active long-running queries, or table bloat.
- Designing high-performance indexing strategies (B-Tree, GIN, GiST, Partial, Covering/INCLUDE, Compound indexes).
- Executing non-blocking, zero-downtime schema migrations (DDL safety, concurrent index creation, lock timeouts).
- Configuring connection pools (pgBouncer, ProxySQL), autovacuum tuning, and buffer pool optimization.
- Running the automated migration safety guard (`scripts/migration-safety-guard.mjs`).

---

## 1. Degrees of Freedom Model

| Freedom Level | Area | Application & Constraints |
| :--- | :--- | :--- |
| **High Freedom** | Schema Design & Normalization | Designing relational entities, choosing partitioning keys, denormalization trade-offs, JSONB usage vs normalized tables. |
| **Medium Freedom** | Index Types & Memory Sizing | Index type selection (B-Tree vs GIN vs Partial), `work_mem` sizing per query complexity, autovacuum scale factors. |
| **Low Freedom** | Production DDL Execution | Mandatory `SET lock_timeout = '3s'`, mandatory `CONCURRENTLY` on index creation/drops, batched backfills (zero mass updates), instant column additions. |

---

## 2. Safety Checklist for Database Operations

When performing write operations, DDL migrations, or index drops on production databases, execute the following checklist:

```markdown
- [ ] Step 1: Check Lock Contention & Active Queries
      - Run active query diagnostics before attempting DDL modifications.
- [ ] Step 2: Set Lock Timeout Protection
      - Always configure explicit lock timeouts (SET lock_timeout = '3s') to prevent connection pile-up.
- [ ] Step 3: Non-Blocking Execution Strategy
      - Use CREATE INDEX CONCURRENTLY (PostgreSQL) or ALGORITHM=INPLACE, LOCK=NONE (MySQL).
- [ ] Step 4: Dry Run Execution Plan
      - Run EXPLAIN (ANALYZE, BUFFERS) on target queries before and after index modifications.
- [ ] Step 5: Automated DDL Audit
      - Run migration linter: node .agent/skills/managing-postgres-mysql/scripts/migration-safety-guard.mjs
```

---

## 3. Workflow 1: PostgreSQL Diagnostics & Tuning

### A. Identify Slow Queries & Lock Contention
```sql
-- PostgreSQL: Active queries running longer than 5 seconds
SELECT 
    pid, 
    usename, 
    client_addr, 
    now() - query_start AS duration, 
    state, 
    wait_event_type, 
    wait_event, 
    query 
FROM pg_stat_activity 
WHERE state != 'idle' 
  AND (now() - query_start) > interval '5 seconds'
ORDER BY duration DESC;
```

### B. Execution Plan Analysis
Always request `BUFFERS` to inspect shared hit/read pages:
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS)
SELECT c.id, c.name, COUNT(o.id) AS total_orders
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.id, c.name;
```

---

## 4. Workflow 2: MySQL & InnoDB Diagnostics & Tuning

### A. Process List & Lock Wait Inspection
```sql
-- MySQL: Long running processes
SELECT 
    id, user, host, db, command, time, state, info 
FROM information_schema.processlist 
WHERE command != 'Sleep' 
  AND time > 5 
ORDER BY time DESC;
```

### B. JSON Execution Plan
```sql
EXPLAIN FORMAT=JSON
SELECT u.id, u.email, p.title 
FROM users u 
JOIN posts p ON p.user_id = u.id 
WHERE p.status = 'published' AND u.created_at > '2026-01-01';
```

---

## 5. Automated DDL Migration Verification

Run the migration safety guard across SQL migration directories:

```bash
node .agent/skills/managing-postgres-mysql/scripts/migration-safety-guard.mjs --path migrations/ --dialect postgres
```

---

## 6. Quick Reference Tools & Resources

- **Migration Safety Guard Script**: [migration-safety-guard.mjs](./scripts/migration-safety-guard.mjs) - Node.js CLI script inspecting SQL migrations for blocking table locks and missing timeouts.
- **Zero-Downtime Migration Pattern**: [zero-downtime-migration-template.sql](./examples/zero-downtime-migration-template.sql) - Production SQL migration demonstrating safe 5-phase column addition, backfill, and index creation.
- **PostgreSQL DBA Diagnostic Script**: [postgres-dba-toolkit.sql](./examples/postgres-dba-toolkit.sql) - Diagnostic queries for slow queries, cache hit ratio, and table bloat.
- **MySQL/InnoDB Diagnostic Script**: [mysql-dba-toolkit.sql](./examples/mysql-dba-toolkit.sql) - Diagnostic queries for InnoDB locks, transaction states, and thread starvation.
- **DBA Tuning Playbook**: [database-tuning-playbook.md](./references/database-tuning-playbook.md) - Deep reference on buffer pool calculation, autovacuum aggressive tuning, and connection pool sizing.
- **Zero-Downtime Migration Guide**: [zero-downtime-migrations.md](./resources/zero-downtime-migrations.md) - Architectural guide on online schema changes, shadow tables, and lock timeouts.
