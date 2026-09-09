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

