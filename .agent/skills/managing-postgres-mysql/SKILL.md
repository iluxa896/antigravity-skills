---
name: managing-postgres-mysql
description: >-
  Provides expert DBA workflows, query tuning, indexing strategies, diagnostic queries, and
  zero-downtime migration guidelines for PostgreSQL and MySQL. Use when analyzing slow queries,
  tuning execution plans (EXPLAIN ANALYZE), resolving deadlocks, configuring connection pooling
  (pgBouncer/ProxySQL), auditing migrations for table locks, or optimizing autovacuum and buffer caches.
---

# Managing PostgreSQL & MySQL Databases

## When to use this skill
- Analyzing slow queries and execution plans (`EXPLAIN`, `EXPLAIN ANALYZE`, `EXPLAIN FORMAT=JSON`).
- Diagnosing deadlocks, lock contention, long-running queries, and table bloat.
- Designing high-performance indexing (B-Tree, GIN, GiST, Partial, Covering/INCLUDE, Compound).
- Executing non-blocking zero-downtime schema migrations.
- Configuring pgBouncer, ProxySQL, autovacuum, and buffer pool optimization.

---

## 1. Degrees of Freedom

| Level | Area | Constraints |
| :--- | :--- | :--- |
| **High** | Schema Design | Entity modeling, partitioning keys, JSONB vs normalized tables, denormalization trade-offs. |
| **Medium** | Index Types & Memory | B-Tree vs GIN vs Partial, `work_mem` sizing, autovacuum scale factors. |
| **Low** | Production DDL | Mandatory `SET lock_timeout = '3s'`, mandatory `CONCURRENTLY` on index ops, batched backfills only. |

---

## 2. Production Safety Checklist

```
[ ] 1. Check Active Queries & Locks — run diagnostics before any DDL.
[ ] 2. Set Lock Timeout — SET lock_timeout = '3s' to prevent connection pile-up.
[ ] 3. Non-Blocking Strategy — CREATE INDEX CONCURRENTLY (PG) or ALGORITHM=INPLACE,LOCK=NONE (MySQL).
[ ] 4. Dry-Run Execution Plan — EXPLAIN (ANALYZE, BUFFERS) before and after index changes.
[ ] 5. Automated DDL Audit — node .agent/skills/managing-postgres-mysql/scripts/migration-safety-guard.mjs --path migrations/ --dialect postgres
```

---

## 3. PostgreSQL Diagnostics

### Active Slow Queries & Lock Contention
```sql
SELECT pid, usename, client_addr,
       now() - query_start AS duration,
       state, wait_event_type, wait_event, query
FROM   pg_stat_activity
WHERE  state != 'idle'
  AND  (now() - query_start) > interval '5 seconds'
ORDER BY duration DESC;
```

### Execution Plan (always use BUFFERS)
```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, SETTINGS)
SELECT c.id, c.name, COUNT(o.id) AS total_orders
FROM   customers c
JOIN   orders o ON o.customer_id = c.id
WHERE  o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.id, c.name;
```

### Table Bloat & Cache Hit Ratio
See [postgres-dba-toolkit.sql](./examples/postgres-dba-toolkit.sql) for bloat estimates, index usage stats, and cache hit ratio queries.

---

## 4. MySQL / InnoDB Diagnostics

### Process List & Lock Waits
```sql
SELECT id, user, host, db, command, time, state, info
FROM   information_schema.processlist
WHERE  command != 'Sleep' AND time > 5
ORDER BY time DESC;
```

### JSON Execution Plan
```sql
EXPLAIN FORMAT=JSON
SELECT u.id, u.email, p.title
FROM   users u
JOIN   posts p ON p.user_id = u.id
WHERE  p.status = 'published' AND u.created_at > '2026-01-01';
```

### InnoDB Lock & Transaction State
See [mysql-dba-toolkit.sql](./examples/mysql-dba-toolkit.sql) for InnoDB lock waits, transaction states, and thread starvation queries.

---

## 5. Zero-Downtime Migration Pattern

5-phase safe column addition — see [zero-downtime-migration-template.sql](./examples/zero-downtime-migration-template.sql):
1. `ADD COLUMN col TYPE DEFAULT NULL` (instant metadata change).
2. Batched backfill in chunks with `WHERE id BETWEEN x AND y`.
3. `CREATE INDEX CONCURRENTLY` on the new column.
4. Apply `NOT NULL` constraint after backfill is verified.
5. Drop old column after dual-write period ends.

---

## 6. Reference Files

- **Migration Safety Guard**: [migration-safety-guard.mjs](./scripts/migration-safety-guard.mjs) — lints SQL migrations for blocking locks and missing timeouts.
- **Zero-Downtime Template**: [zero-downtime-migration-template.sql](./examples/zero-downtime-migration-template.sql)
- **PostgreSQL Toolkit**: [postgres-dba-toolkit.sql](./examples/postgres-dba-toolkit.sql)
- **MySQL Toolkit**: [mysql-dba-toolkit.sql](./examples/mysql-dba-toolkit.sql)
- **Tuning Playbook**: [database-tuning-playbook.md](./references/database-tuning-playbook.md) — buffer pool calc, autovacuum tuning, connection pool sizing.
- **Migration Guide**: [zero-downtime-migrations.md](./resources/zero-downtime-migrations.md) — online schema changes, shadow tables, lock timeouts.
