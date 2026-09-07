# Enterprise Destructive Testing & Edge-Case Engineering

This reference guide provides systematic methodologies for identifying failure modes, boundary limits, concurrency hazards, and race conditions across software architectures.

---

## 1. Boundary Value Analysis (BVA) & Partitioning

Boundary values represent the edges between equivalence partitions where off-by-one errors and buffer overruns occur.

### Boundary Test Matrix

| Input Category | Lower Boundary | Valid Nominal | Upper Boundary | Catastrophic Edge |
| :--- | :--- | :--- | :--- | :--- |
| **Integer Counters** | `-1`, `0`, `1` | `42`, `100` | `2^31 - 1`, `2^31` | `2^63 - 1` (64-bit max), negative ints |
| **Monetary Values** | `0.00`, `0.01` | `49.99` | `999,999.99` | Floating-point rounding error (`0.1 + 0.2 != 0.3`) |
| **String Lengths** | Empty `""` (0 chars) | `25` chars | Max allowed (e.g., 255 chars) | `10,000+` chars (DoS buffer inflation) |
| **Unicode & Emojis** | ASCII characters | UTF-8 multibyte (`ü`, `ø`, `ñ`) | 4-byte UTF-8 emojis (`🚀`, `🔥`) | Zero-width joiners (`\u200B`), RTL markers (`\u202E`) |
| **Arrays & Collections**| Empty array `[]` | Single element `[item]` | Max page size (e.g., 100) | `100,000` items (Out-of-Memory / heap crash) |

---

## 2. Concurrency & Race Condition Attack Vectors

Concurrent operations frequently bypass naive business rules if locks or idempotency tokens are omitted.

### A. Idempotent State Mutation
- **Problem**: When a user double-clicks "Submit Payment" or an automated retry occurs on a timeout, two charges are created for one order.
- **Testing Pattern**:
  1. Generate a single client-side UUID idempotency key (`Idempotency-Key: <uuid>`).
  2. Dispatch 10 parallel HTTP POST requests with identical idempotency keys.
  3. Verify: Exactly 1 request produces HTTP 200/201 and creates a charge. The other 9 requests return HTTP 200 with the cached response or HTTP 409 Conflict.

### B. Optimistic Lock Verification
- **Problem**: Two users edit the same document concurrently. User B's save overwrites User A's changes without notice (Lost Update problem).
- **Testing Pattern**:
  1. Fetch entity with `version = 1`.
  2. From Process 1, update entity: `UPDATE documents SET content = 'A', version = version + 1 WHERE id = 10 AND version = 1`.
  3. From Process 2 (concurrent), attempt to update with outdated version: `UPDATE documents SET content = 'B', version = version + 1 WHERE id = 10 AND version = 1`.
  4. Verify: Process 2 receives `0 rows affected` and surfaces a `409 VersionConflictException`.

---

## 3. Network Fault Injection & Chaos Testing

Simulate production network failures to ensure graceful degradation:

1. **Simulated High Latency (Slow 3G)**: Throttle connection to 400kbps / 2000ms RTT. Verify UI displays accessible skeleton loaders without freezing or triggering duplicate requests.
2. **Upstream Gateway Timeouts (HTTP 504)**: Mock API gateway returning 504 after 30 seconds. Verify frontend displays "Service temporarily unavailable, please retry" without erasing customer form entries.
3. **Dropped WebSocket Connections**: Kill socket connection mid-session. Verify auto-reconnect backoff (exponential backoff: 1s, 2s, 4s, 8s) and state synchronization upon reconnect.

---

## 4. Digital Accessibility (WCAG 2.1 AA) Traps

- **Keyboard Traps**: Ensure focus never gets stuck inside modals, dropdowns, or iframe widgets. `Esc` key must always close modal overlays and return focus to the trigger button.
- **Focus Order**: Ensure Tab navigation follows reading order and skip-to-content links bypass repeated headers.
- **Live Regions**: Asynchronous error messages or toast notifications must use `aria-live="assertive"` for critical alerts and `aria-live="polite"` for background updates.
