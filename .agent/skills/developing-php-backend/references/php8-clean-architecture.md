# Enterprise PHP 8 Clean Architecture & Domain Design

This architectural guide documents domain modeling, Action-Domain-Responder (ADR), typed Data Transfer Objects (DTOs), Result monads, and high-performance database patterns in modern PHP 8.2 – 8.4+.

---

## 1. Action-Domain-Responder (ADR) Pattern

Replace bloated resource controllers with single-responsibility Action classes:

```php
// app/Http/Actions/Orders/CreateOrderAction.php
namespace App\Http\Actions\Orders;

use App\Domain\Orders\Services\OrderCreationService;
use App\Http\Requests\Orders\CreateOrderRequest;
use App\Http\Resources\Orders\OrderResource;
use Illuminate\Http\JsonResponse;

final readonly class CreateOrderAction
{
    public function __construct(
        private OrderCreationService $orderService,
    ) {}

    public function __invoke(CreateOrderRequest $request): JsonResponse
    {
        $dto = $request->toDto();
        $order = $this->orderService->createOrder($dto);

        // For REST APIs (Archetype B): Return JsonResponse
        // For Inertia Monoliths (Archetype A): Return RedirectResponse: to_route('orders.show', $order->id)->with('success', '...')
        return (new OrderResource($order))
            ->response()
            ->setStatusCode(201);
    }
}
```


---

## 2. Immutable Typed DTOs with Constructor Promotion

Never pass untyped associative arrays between application layers:

```php
namespace App\Domain\Orders\DataTransferObjects;

final readonly class CreateOrderDto
{
    /**
     * @param list<OrderItemDto> $items
     */
    public function __construct(
        public int $customerId,
        public array $items,
        public string $currency,
        public ?string $promoCode = null,
    ) {}
}
```

---

## 3. The Result / Monadic Pattern for Domain Operations

Avoid using exceptions for predictable business rejections (e.g., insufficient balance, out of stock):

```php
namespace App\Domain\Common;

/**
 * @template T
 */
final readonly class Result
{
    private function __construct(
        public bool $isSuccess,
        public mixed $value = null,
        public ?string $errorMessage = null,
    ) {}

    /**
     * @param T $value
     * @return self<T>
     */
    public static function ok(mixed $value): self
    {
        return new self(true, value: $value);
    }

    public static function fail(string $message): self
    {
        return new self(false, errorMessage: $message);
    }
}
```

---

## 4. OPcache Tuning & File Preloading

In production Docker containers, configure preloading in `php.ini`:
```ini
opcache.enable=1
opcache.enable_cli=0
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.validate_timestamps=0
opcache.preload=/var/www/html/preload.php
Preloading compiles framework classes into shared memory before handling HTTP requests, reducing request overhead to near zero.

---

## 5. Command-Query Separation (CQS) & DTO Pragmatism

A senior software engineer avoids layer proliferation and cargo-cult abstractions:

### Query Side (Reads from Database)
- **Direct Eloquent Execution**: For standard reads (catalog listings, item details, admin tables), controllers should directly invoke Eloquent scopes or thin Query Services:
  ```php
  $cards = Card::published()->with(['category', 'tags'])->paginate(15);
  ```
- **Why NOT DTO on simple reads**: Eloquent models in Laravel 11 are strongly typed via `casts()`, BackedEnums, and PHPDoc generics (`Collection<int, Card>`). Mapping simple reads to DTOs causes double object allocation in memory, increases GC pressure, breaks pagination `LengthAwarePaginator`, and violates DRY.
- **When DTOs ARE used for Reads**:
  - Multi-source aggregations (e.g. `SeoMetadataDto` combining configs, models, and JSON-LD).
  - External 3rd-party API responses (CDEK, YooKassa, Telegram).
  - Analytical reports without a single backing model.

### Command Side (Writes / Mutations)
- **Full Domain Protection**: User input is untrusted. Use `FormRequest` for validation, map to a typed DTO (`final readonly class`), and execute through an Action / Domain Service inside `DB::transaction()`.

---

## 6. Concurrency & Transactional Locking (Race Condition Defense)

When mutating shared state (balances, ticket bookings, inventory counts, discount limits), wrapping statements in `DB::transaction()` is **necessary but insufficient** without explicit row locking. Without locks, concurrent requests execute read-then-write simultaneously, leading to balance overdraws or double bookings.

### A. Pessimistic Locking (`lockForUpdate()`)
Use pessimistic locking to block concurrent reads/writes on the affected rows until the transaction commits:

```php
return DB::transaction(static function () use ($dto): Order {
    // 1. Acquire exclusive lock on the inventory row
    $stock = StockItem::query()
        ->where('product_id', $dto->productId)
        ->lockForUpdate()
        ->firstOrFail();

    // 2. Validate invariant with fresh locked data
    if ($stock->quantity < $dto->quantity) {
        throw new InsufficientStockException('Requested quantity exceeds available stock.');
    }

    // 3. Atomically mutate
    $stock->decrement('quantity', $dto->quantity);

    return Order::create([...]);
});
```

### B. Deadlock Prevention Strategy
When locking multiple rows (e.g. transfers between accounts A and B), **always acquire locks in deterministic sorted order** (e.g., `min($id1, $id2)` then `max($id1, $id2)`). This prevents cyclic wait conditions where Request 1 locks A and waits for B, while Request 2 locks B and waits for A.

---

## 7. Queue & Event Transactional Safety (`afterCommit`)

### The "Ghost Record" Antipattern
A frequent junior backend error is dispatching events or queue jobs *inside* a database transaction without waiting for the commit:

```php
// ❌ DANGEROUS: Worker picks up job before the database transaction is committed!
DB::transaction(function () use ($dto) {
    $order = Order::create([...]);
    SendOrderConfirmationJob::dispatch($order->id); // Worker runs immediately, gets ModelNotFoundException
    sleep(1); // Simulating complex multi-step transaction
});
```

### The Solution: `afterCommit` & `ShouldQueueAfterCommit`
Ensure background jobs and events are only published after the transaction successfully commits:

1. **Fluent Dispatch**: `SendOrderConfirmationJob::dispatch($order->id)->afterCommit();`
2. **Job Property**: `$this->afterCommit = true;` in job constructor.
3. **Event Listener**: Mark listeners with `implements ShouldQueueAfterCommit`.

### Job Idempotency (`ShouldBeUnique`)
Workers can fail and retry. To avoid duplicate side-effects (duplicate charges, spam emails), enforce idempotency:
```php
class ProcessPaymentJob implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $uniqueFor = 3600; // Lock duration in seconds

    public function __construct(public readonly string $paymentReference)
    {
        $this->afterCommit = true;
    }

    public function uniqueId(): string
    {
        return $this->paymentReference;
    }
}
```

