# PostgreSQL & MySQL Performance Tuning Playbook

This reference provides DBA formulas, memory sizing calculations, and diagnostic workflows for database engineers.

---

## 1. Memory Sizing Calculations

### PostgreSQL Dedicated Server Sizing
- **`shared_buffers`**: $25\%$ of total system RAM (e.g. 16GB RAM $\rightarrow$ 4GB `shared_buffers`).
- **`effective_cache_size`**: $75\%$ of total system RAM (helps query planner estimate OS page cache).
- **`work_mem`**: $\frac{\text{Available RAM} - \text{shared\_buffers}}{\text{max\_connections} \times 3}$. Start around 32MB–64MB. Setting too high causes OOM during complex hash joins.
- **`maintenance_work_mem`**: 1GB–2GB for rapid VACUUM and `CREATE INDEX CONCURRENTLY` execution.

### MySQL InnoDB Dedicated Server Sizing
- **`innodb_buffer_pool_size`**: $70\% - 80\%$ of total RAM on a dedicated database instance.
- **`innodb_log_file_size`**: $25\%$ of `innodb_buffer_pool_size` (e.g. 8GB buffer pool $\rightarrow$ 2GB log file).
- **`innodb_flush_log_at_trx_commit`**: Set to `1` for ACID compliance; `2` for high-throughput with 1-second crash recovery risk.

---

## 2. PostgreSQL Autovacuum Aggressive Tuning

Default autovacuum settings are too passive for modern write-heavy workloads, resulting in table bloat and wraparound emergencies.

### Production Recommendations:
```ini
# Increase worker throughput
autovacuum_max_workers = 5
autovacuum_vacuum_cost_limit = 2000
autovacuum_vacuum_cost_delay = 2ms

# Trigger vacuums earlier (at 5% bloat rather than default 20%)
autovacuum_vacuum_scale_factor = 0.05
autovacuum_vacuum_threshold = 500
autovacuum_analyze_scale_factor = 0.02
```

---

## 3. Connection Pooling Mathematics & Little's Law

Direct application-to-database connection models (e.g. 1,000 PHP-FPM or Node workers connecting directly) destroy database performance through context switching and cache eviction.

$$\text{Optimal Pool Size} = (\text{CPU Cores} \times 2) + \text{Spindle / SSD effective disk count}$$

For an 8-core database server with NVMe SSDs:
$$\text{Pool Size} \approx 8 \times 2 + 1 = 17 \text{ active connections}$$

Deploy **pgBouncer** in `transaction` mode or **ProxySQL** for MySQL to multiplex thousands of client connections onto 20–50 backend database connections.

---

## 4. Execution Plan Inspection (`EXPLAIN (ANALYZE, BUFFERS)`)

Key warning signs in PostgreSQL query plans:
- **`Seq Scan` on Large Table**: Missing index on WHERE/JOIN predicates.
- **`Rows Removed by Filter`**: Index covers only part of the condition.
- **`Buffers: shared read=...`**: High disk I/O; table/index is not in memory.
- **`Sort Method: external merge Disk`**: `work_mem` is too low for the query sort size.
