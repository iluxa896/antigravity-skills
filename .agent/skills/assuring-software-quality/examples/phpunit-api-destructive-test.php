<?php

namespace Tests\Feature\Api;

use PHPUnit\Framework\TestCase;
use RuntimeException;
use InvalidArgumentException;

/**
 * Enterprise PHPUnit API Destructive Test Suite
 *
 * Demonstrates destructive API testing patterns: boundary analysis, negative input fuzzing,
 * idempotency token replay attacks, database transaction rollback validation, and
 * graceful degradation under upstream failure.
 */
final class OrderApiDestructiveTest extends TestCase
{
    private MockDatabaseConnection $db;
    private OrderProcessingService $orderService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->db = new MockDatabaseConnection();
        $this->orderService = new OrderProcessingService($this->db);
    }

    /**
     * @test
     * Happy Path: Valid payload with proper idempotency key produces successful persisted order.
     */
    public function testSuccessfulOrderPlacementWithIdempotency(): void
    {
        $idempotencyKey = 'idem_key_' . bin2hex(random_bytes(16));
        $payload = [
            'customer_id' => 1042,
            'items' => [
                ['sku' => 'SKU-CARD-001', 'quantity' => 2, 'unit_price' => 1500],
            ],
            'currency' => 'EUR',
        ];

        $order = $this->orderService->processOrder($idempotencyKey, $payload);

        $this->assertSame('CONFIRMED', $order['status']);
        $this->assertSame(3000, $order['total_amount']);
        $this->assertTrue($this->db->isCommitted());
    }

    /**
     * @test
     * Destructive: Duplicate submission with the same idempotency key must not duplicate charges.
     */
    public function testDuplicateIdempotencyKeyReturnsCachedOrderWithoutDoubleCharging(): void
    {
        $idempotencyKey = 'idem_unique_replay_token_991';
        $payload = [
            'customer_id' => 1042,
            'items' => [
                ['sku' => 'SKU-CARD-001', 'quantity' => 1, 'unit_price' => 2500],
            ],
            'currency' => 'USD',
        ];

        // First call
        $firstOrder = $this->orderService->processOrder($idempotencyKey, $payload);

        // Immediate replay with same idempotency key
        $secondOrder = $this->orderService->processOrder($idempotencyKey, $payload);

        $this->assertSame($firstOrder['order_id'], $secondOrder['order_id']);
        $this->assertSame(1, $this->db->getTransactionCount(), 'Expected exactly one transaction execution');
    }

    /**
     * @test
     * Boundary & Negative: Extreme integer overflows, negative quantities, and zero unit prices.
     *
     * @dataProvider invalidPayloadBoundaryDataProvider
     */
    public function testBoundaryAndMalformedPayloadsTriggerExplicitValidationExceptions(array $malformedPayload, string $expectedExceptionMessage): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage($expectedExceptionMessage);

        $idempotencyKey = 'idem_key_' . bin2hex(random_bytes(8));
        $this->orderService->processOrder($idempotencyKey, $malformedPayload);
    }

    public static function invalidPayloadBoundaryDataProvider(): array
    {
        return [
            'negative quantity' => [
                ['customer_id' => 101, 'items' => [['sku' => 'SKU-1', 'quantity' => -5, 'unit_price' => 100]], 'currency' => 'USD'],
                'Quantity must be greater than zero',
            ],
            'zero quantity' => [
                ['customer_id' => 101, 'items' => [['sku' => 'SKU-1', 'quantity' => 0, 'unit_price' => 100]], 'currency' => 'USD'],
                'Quantity must be greater than zero',
            ],
            'empty items array' => [
                ['customer_id' => 101, 'items' => [], 'currency' => 'USD'],
                'Order must contain at least one item',
            ],
            'integer overflow quantity' => [
                ['customer_id' => 101, 'items' => [['sku' => 'SKU-1', 'quantity' => PHP_INT_MAX, 'unit_price' => 1000]], 'currency' => 'USD'],
                'Total order amount exceeds permissible limit',
            ],
            'unsupported currency code' => [
                ['customer_id' => 101, 'items' => [['sku' => 'SKU-1', 'quantity' => 1, 'unit_price' => 100]], 'currency' => 'XYZ'],
                'Invalid ISO-4217 currency',
            ],
        ];
    }

    /**
     * @test
     * Destructive: Simulated database deadlock during checkout triggers transaction rollback and returns 500 equivalent.
     */
    public function testDatabaseDeadlockRollsBackTransactionCleanly(): void
    {
        $this->db->simulateDeadlockOnNextWrite();

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Deadlock detected during transaction execution');

        $idempotencyKey = 'idem_key_' . bin2hex(random_bytes(8));
        $payload = [
            'customer_id' => 500,
            'items' => [['sku' => 'SKU-DEADLOCK', 'quantity' => 1, 'unit_price' => 5000]],
            'currency' => 'EUR',
        ];

        try {
            $this->orderService->processOrder($idempotencyKey, $payload);
        } finally {
            $this->assertTrue($this->db->isRolledBack(), 'Database transaction must be rolled back on error');
        }
    }
}

// -----------------------------------------------------------------------------
// Production Supporting Services & Mocks for Isolated Testing
// -----------------------------------------------------------------------------

final class OrderProcessingService
{
    private array $idempotencyCache = [];

    public function __construct(private MockDatabaseConnection $db)
    {
    }

    public function processOrder(string $idempotencyKey, array $payload): array
    {
        if (isset($this->idempotencyCache[$idempotencyKey])) {
            return $this->idempotencyCache[$idempotencyKey];
        }

        $this->validatePayload($payload);

        $this->db->beginTransaction();

        try {
            $totalAmount = 0;
            foreach ($payload['items'] as $item) {
                $subtotal = $item['quantity'] * $item['unit_price'];
                if ($subtotal < 0 || $subtotal > 100_000_000) {
                    throw new InvalidArgumentException('Total order amount exceeds permissible limit');
                }
                $totalAmount += $subtotal;
            }

            $orderId = 'ORD-' . strtoupper(bin2hex(random_bytes(6)));
            $orderRecord = [
                'order_id' => $orderId,
                'status' => 'CONFIRMED',
                'customer_id' => $payload['customer_id'],
                'total_amount' => $totalAmount,
                'currency' => $payload['currency'],
            ];

            $this->db->insert('orders', $orderRecord);
            $this->db->commit();

            $this->idempotencyCache[$idempotencyKey] = $orderRecord;

            return $orderRecord;
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    private function validatePayload(array $payload): void
    {
        if (empty($payload['items'])) {
            throw new InvalidArgumentException('Order must contain at least one item');
        }

        if (!in_array($payload['currency'] ?? '', ['USD', 'EUR', 'GBP'], true)) {
            throw new InvalidArgumentException('Invalid ISO-4217 currency');
        }

        foreach ($payload['items'] as $item) {
            if (!isset($item['quantity']) || $item['quantity'] <= 0) {
                throw new InvalidArgumentException('Quantity must be greater than zero');
            }
        }
    }
}

final class MockDatabaseConnection
{
    private bool $inTransaction = false;
    private bool $committed = false;
    private bool $rolledBack = false;
    private int $transactionCount = 0;
    private bool $failWithDeadlock = false;

    public function simulateDeadlockOnNextWrite(): void
    {
        $this->failWithDeadlock = true;
    }

    public function beginTransaction(): void
    {
        $this->inTransaction = true;
        $this->committed = false;
        $this->rolledBack = false;
    }

    public function insert(string $table, array $data): void
    {
        if ($this->failWithDeadlock) {
            throw new RuntimeException('Deadlock detected during transaction execution');
        }
    }

    public function commit(): void
    {
        if (!$this->inTransaction) {
            throw new RuntimeException('Cannot commit without active transaction');
        }
        $this->inTransaction = false;
        $this->committed = true;
        $this->transactionCount++;
    }

    public function rollback(): void
    {
        $this->inTransaction = false;
        $this->rolledBack = true;
    }

    public function isCommitted(): bool
    {
        return $this->committed;
    }

    public function isRolledBack(): bool
    {
        return $this->rolledBack;
    }

    public function getTransactionCount(): int
    {
        return $this->transactionCount;
    }
}
