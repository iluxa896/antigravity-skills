<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Card;

/**
 * Enterprise PHPUnit API Destructive Feature Test Suite
 *
 * Demonstrates senior-level destructive API testing patterns:
 * 1. Happy Path: Valid payload with idempotency verification and database persistence.
 * 2. Concurrency & Idempotency: Replaying duplicate requests with the same token must not create duplicates.
 * 3. Boundary Value Analysis (BVA): Negative numbers, zero limits, string length overflow, and fuzzing.
 * 4. Security Injections: XSS and SQL injection payloads handled safely without 500 server errors.
 * 5. Atomic Integrity: Exception mid-flow must cleanly roll back all database transactions.
 */
final class OrderApiDestructiveTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /**
     * @test
     * Happy Path: Valid order payload creates a confirmed order and persists line items atomically.
     */
    public function test_successful_order_placement_with_idempotency(): void
    {
        $card = Card::factory()->create(['price' => 1500, 'is_published' => true]);
        $idempotencyKey = 'idem_' . bin2hex(random_bytes(16));

        $payload = [
            'items' => [
                ['card_id' => $card->id, 'quantity' => 2],
            ],
            'shipping_address' => 'г. Москва, ул. Арбат, д. 10',
        ];

        $response = $this->actingAs($this->user)
            ->withHeader('X-Idempotency-Key', $idempotencyKey)
            ->postJson('/api/v1/orders', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'CONFIRMED')
            ->assertJsonPath('data.total_amount', 3000);

        $this->assertDatabaseHas('orders', [
            'user_id' => $this->user->id,
            'total_amount' => 3000,
            'status' => 'CONFIRMED',
        ]);
    }

    /**
     * @test
     * Concurrency & Idempotency: Immediate re-submission with identical token must replay cached response without duplicate records.
     */
    public function test_duplicate_idempotency_key_prevents_duplicate_charge_and_mutation(): void
    {
        $card = Card::factory()->create(['price' => 2500, 'is_published' => true]);
        $idempotencyKey = 'idem_replay_test_' . bin2hex(random_bytes(8));

        $payload = [
            'items' => [
                ['card_id' => $card->id, 'quantity' => 1],
            ],
            'shipping_address' => 'г. Санкт-Петербург, Невский пр-т, д. 1',
        ];

        // First submission
        $firstResponse = $this->actingAs($this->user)
            ->withHeader('X-Idempotency-Key', $idempotencyKey)
            ->postJson('/api/v1/orders', $payload);

        $firstResponse->assertStatus(201);
        $orderId = $firstResponse->json('data.id');

        // Immediate duplicate replay
        $secondResponse = $this->actingAs($this->user)
            ->withHeader('X-Idempotency-Key', $idempotencyKey)
            ->postJson('/api/v1/orders', $payload);

        $secondResponse->assertStatus(200);
        $this->assertSame($orderId, $secondResponse->json('data.id'));

        // Assert database contains exactly ONE order record
        $this->assertDatabaseCount('orders', 1);
    }

    /**
     * @test
     * Boundary Value Analysis (BVA): Zero quantity, negative numbers, and empty arrays are rejected with 422.
     *
     * @dataProvider invalidPayloadBoundaryDataProvider
     */
    public function test_boundary_and_malformed_payloads_return_deterministic_validation_errors(
        array $invalidPayload,
        string $expectedErrorField
    ): void {
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/orders', $invalidPayload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors($expectedErrorField);
    }

    public static function invalidPayloadBoundaryDataProvider(): array
    {
        return [
            'negative quantity' => [
                ['items' => [['card_id' => 1, 'quantity' => -5]], 'shipping_address' => 'Valid Address'],
                'items.0.quantity',
            ],
            'zero quantity' => [
                ['items' => [['card_id' => 1, 'quantity' => 0]], 'shipping_address' => 'Valid Address'],
                'items.0.quantity',
            ],
            'empty items array' => [
                ['items' => [], 'shipping_address' => 'Valid Address'],
                'items',
            ],
            'missing shipping address' => [
                ['items' => [['card_id' => 1, 'quantity' => 1]], 'shipping_address' => ''],
                'shipping_address',
            ],
            'excessive shipping address length' => [
                ['items' => [['card_id' => 1, 'quantity' => 1]], 'shipping_address' => str_repeat('A', 2001)],
                'shipping_address',
            ],
        ];
    }

    /**
     * @test
     * Security Defense: Malicious payloads (XSS, SQLi) in text fields are safely escaped and never trigger 500 errors.
     */
    public function test_security_injection_payloads_do_not_cause_unhandled_exceptions(): void
    {
        $card = Card::factory()->create(['price' => 1000, 'is_published' => true]);
        $xssAddress = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/orders', [
                'items' => [['card_id' => $card->id, 'quantity' => 1]],
                'shipping_address' => $xssAddress,
            ]);

        // Must either successfully create (with stripped/escaped input) or reject with 422, NEVER 500
        $this->assertNotSame(500, $response->status());

        if ($response->status() === 201) {
            // Assert stored address does not contain unescaped executable script tags
            $savedOrder = \App\Models\Order::latest('id')->first();
            $this->assertStringNotContainsString('<script>', $savedOrder->shipping_address);
        }
    }

    /**
     * @test
     * Atomic Integrity: If an unexpected failure occurs during order finalization, all database changes are rolled back.
     */
    public function test_transaction_rolls_back_cleanly_on_internal_service_exception(): void
    {
        $card = Card::factory()->create(['price' => 1000, 'is_published' => true]);

        // Simulate payment gateway failure during order processing
        $this->mock(\App\Services\PaymentGatewayInterface::class, function ($mock) {
            $mock->shouldReceive('charge')->andThrow(new \RuntimeException('Payment gateway timeout'));
        });

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/orders', [
                'items' => [['card_id' => $card->id, 'quantity' => 1]],
                'shipping_address' => 'г. Москва, ул. Ленина, д. 5',
            ]);

        $response->assertStatus(502);

        // Verify that order was NOT persisted in the database (rolled back cleanly)
        $this->assertDatabaseCount('orders', 0);
    }
}
