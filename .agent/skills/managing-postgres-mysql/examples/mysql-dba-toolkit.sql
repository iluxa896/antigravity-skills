-- MySQL / InnoDB DBA Toolkit: Diagnostic Queries & Performance Optimization

-- 1. Active Non-Sleep Queries Order by Duration
SELECT 
    ID, 
    USER, 
    HOST, 
    DB, 
    COMMAND, 
    TIME AS duration_seconds, 
    STATE, 
    LEFT(INFO, 100) AS query_snippet
FROM INFORMATION_SCHEMA.PROCESSLIST
WHERE COMMAND != 'Sleep' 
  AND TIME > 2
ORDER BY TIME DESC;

-- 2. InnoDB Lock Waits and Blocking Transactions (MySQL 8.0+)
SELECT 
    r.trx_id AS waiting_trx_id,
    r.trx_mysql_thread_id AS waiting_thread,
    r.trx_query AS waiting_query,
    b.trx_id AS blocking_trx_id,
    b.trx_mysql_thread_id AS blocking_thread,
    b.trx_query AS blocking_query
FROM performance_schema.data_lock_waits w
JOIN information_schema.innodb_trx r ON r.trx_id = w.requesting_engine_transaction_id
JOIN information_schema.innodb_trx b ON b.trx_id = w.blocking_engine_transaction_id;

-- 3. Unused Indexes (Performance Schema)
SELECT 
    object_schema AS database_name,
    object_name AS table_name,
    index_name
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL
  AND count_star = 0
  AND index_name != 'PRIMARY'
ORDER BY object_schema, object_name;

-- 4. Top Queries by Execution Time (Performance Schema Digest)
SELECT 
    schema_name,
    digest_text,
    count_star AS exec_count,
    ROUND(sum_timer_wait / 1000000000000, 2) AS total_time_sec,
    ROUND(avg_timer_wait / 1000000000, 2) AS avg_time_ms
FROM performance_schema.events_statements_summary_by_digest
WHERE schema_name IS NOT NULL
ORDER BY sum_timer_wait DESC
LIMIT 15;
