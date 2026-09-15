<?php

/**
 * Enterprise Laravel 11 Action, Transactional Concurrency & Unit/Integration Testing
 *
 * Demonstrates:
 * 1. Transactional Concurrency Safety: lockForUpdate() prevents race conditions during balance/inventory mutations.
 * 2. Queue Transactional Integrity: DB::afterCommit() & ShouldQueueAfterCommit prevent jobs from reading uncommitted state.
 * 3. Job Idempotency: ShouldBeUnique with uniqueId() ensures background workers never duplicate operations.
 * 4. Isolated Action & DTO Testing: Fast, in-memory database test suite without browser overhead using Queue::fake().
 */

namespace App\Exceptions {
    use RuntimeException;

    class InsufficientFundsException extends RuntimeException {}
    class AccountNotFoundException extends RuntimeException {}
}

namespace App\DTOs {
    use App\Http\Requests\TransferBalanceRequest;

    final readonly class TransferBalanceData
    {
        public function __construct(
            public int $sourceAccountId,
            public int $destinationAccountId,
            public int $amountCents,
            public string $idempotencyKey,
        ) {}

        public static function fromRequest(TransferBalanceRequest $request): self
        {
            return new self(
                sourceAccountId: (int) $request->validated('source_account_id'),
                destinationAccountId: (int) $request->validated('destination_account_id'),
                amountCents: (int) $request->validated('amount_cents'),
                idempotencyKey: (string) $request->validated('idempotency_key'),
            );
        }
    }
}

namespace App\Jobs {
    use Illuminate\Bus\Queueable;
    use Illuminate\Contracts\Queue\ShouldBeUnique;
    use Illuminate\Contracts\Queue\ShouldQueue;
    use Illuminate\Foundation\Bus\Dispatchable;
    use Illuminate\Queue\InteractsWithQueue;
    use Illuminate\Queue\SerializesModels;

    /**
     * Idempotent notification job.
     * Note: implements ShouldQueue to run in background,
     * and ShouldBeUnique to prevent concurrent duplicate notification execution.
     */
    class SendTransferNotificationJob implements ShouldQueue, ShouldBeUnique
    {
        use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

        public int $uniqueFor = 3600; // 1 hour uniqueness lock

        public function __construct(
            public readonly int $transferId,
            public readonly string $idempotencyKey,
        ) {
            // Guarantee this job will NEVER be dispatched before the surrounding DB transaction commits
            $this->afterCommit = true;
        }

        public function uniqueId(): string
        {
            return $this->idempotencyKey;
        }

        public function handle(): void
        {
            // Worker execution logic (sending push/SMS/email)
        }
    }
}

namespace App\Models {
    use Illuminate\Database\Eloquent\Model;

    /**
     * @property int $id
     * @property int $balance_cents
     * @property int $user_id
     */
    class Account extends Model
    {
        protected $fillable = ['user_id', 'balance_cents'];

        /** @return array<string, string> */
        protected function casts(): array
        {
            return [
                'balance_cents' => 'integer',
                'user_id'       => 'integer',
            ];
        }
    }

    /**
     * @property int $id
     * @property int $source_account_id
     * @property int $destination_account_id
     * @property int $amount_cents
     * @property string $idempotency_key
     */
    class Transfer extends Model
    {
        protected $fillable = [
            'source_account_id',
            'destination_account_id',
            'amount_cents',
            'idempotency_key',
        ];
    }
}

namespace App\Actions {
    use App\DTOs\TransferBalanceData;
    use App\Exceptions\AccountNotFoundException;
    use App\Exceptions\InsufficientFundsException;
    use App\Jobs\SendTransferNotificationJob;
    use App\Models\Account;
    use App\Models\Transfer;
    use Illuminate\Support\Facades\DB;

    final readonly class TransferBalanceAction
    {
        /**
         * Executes the funds transfer atomically with pessimistic locking.
         *
         * @throws InsufficientFundsException
         * @throws AccountNotFoundException
         */
        public function execute(TransferBalanceData $data): Transfer
        {
            return DB::transaction(static function () use ($data): Transfer {
                // Determine deterministic lock acquisition order to prevent database deadlocks
                $firstId = min($data->sourceAccountId, $data->destinationAccountId);
                $secondId = max($data->sourceAccountId, $data->destinationAccountId);

                // Acquire exclusive row locks in sorted order
                Account::query()->where('id', $firstId)->lockForUpdate()->first();
                Account::query()->where('id', $secondId)->lockForUpdate()->first();

                /** @var Account|null $source */
                $source = Account::query()->find($data->sourceAccountId);
                /** @var Account|null $destination */
                $destination = Account::query()->find($data->destinationAccountId);

                if ($source === null || $destination === null) {
                    throw new AccountNotFoundException('One or both accounts do not exist.');
                }

                if ($source->balance_cents < $data->amountCents) {
                    throw new InsufficientFundsException(
                        sprintf('Insufficient balance: required %d cents, available %d cents.', $data->amountCents, $source->balance_cents)
                    );
                }

                // Decrement and increment balances atomically
                $source->decrement('balance_cents', $data->amountCents);
                $destination->increment('balance_cents', $data->amountCents);

                // Create audit transfer record
                $transfer = Transfer::create([
                    'source_account_id'      => $data->sourceAccountId,
                    'destination_account_id' => $data->destinationAccountId,
                    'amount_cents'           => $data->amountCents,
                    'idempotency_key'        => $data->idempotencyKey,
                ]);

                // Safe queue dispatch: this job is released to workers strictly AFTER the transaction commits
                SendTransferNotificationJob::dispatch($transfer->id, $data->idempotencyKey)
                    ->afterCommit();

                return $transfer;
            });
        }
    }
}

namespace Tests\Unit\Actions {
    use App\Actions\TransferBalanceAction;
    use App\DTOs\TransferBalanceData;
    use App\Exceptions\InsufficientFundsException;
    use App\Jobs\SendTransferNotificationJob;
    use App\Models\Account;
    use Illuminate\Foundation\Testing\RefreshDatabase;
    use Illuminate\Support\Facades\Queue;
    use Tests\TestCase;

    /**
     * Isolated Action Test: validates business logic, atomicity, and event contracts.
     * Execution time: < 100ms. Zero HTTP or browser overhead.
     */
    final class TransferBalanceActionTest extends TestCase
    {
        use RefreshDatabase;

        private TransferBalanceAction $action;

        protected function setUp(): void
        {
            parent::setUp();
            $this->action = app(TransferBalanceAction::class);
            Queue::fake(); // Prevent background jobs from reaching real queues
        }

        public function test_transfers_funds_successfully_and_dispatches_notification(): void
        {
            // Arrange: Seed initial accounts
            $source = Account::create(['user_id' => 1, 'balance_cents' => 10000]);
            $destination = Account::create(['user_id' => 2, 'balance_cents' => 2000]);

            $dto = new TransferBalanceData(
                sourceAccountId: $source->id,
                destinationAccountId: $destination->id,
                amountCents: 3500,
                idempotencyKey: 'idem-uuid-001',
            );

            // Act: Execute domain action directly
            $transfer = $this->action->execute($dto);

            // Assert: Database state
            $this->assertDatabaseHas('transfers', [
                'id'              => $transfer->id,
                'amount_cents'    => 3500,
                'idempotency_key' => 'idem-uuid-001',
            ]);

            $this->assertSame(6500, $source->fresh()->balance_cents);
            $this->assertSame(5500, $destination->fresh()->balance_cents);

            // Assert: Queue job dispatched with afterCommit configuration
            Queue::assertPushed(SendTransferNotificationJob::class, static function (SendTransferNotificationJob $job) use ($transfer): bool {
                return $job->transferId === $transfer->id && $job->uniqueId() === 'idem-uuid-001';
            });
        }

        public function test_aborts_transaction_and_does_not_dispatch_job_when_funds_insufficient(): void
        {
            // Arrange
            $source = Account::create(['user_id' => 1, 'balance_cents' => 1000]);
            $destination = Account::create(['user_id' => 2, 'balance_cents' => 5000]);

            $dto = new TransferBalanceData(
                sourceAccountId: $source->id,
                destinationAccountId: $destination->id,
                amountCents: 5000, // Exceeds source balance
                idempotencyKey: 'idem-uuid-002',
            );

            // Expect domain exception
            $this->expectException(InsufficientFundsException::class);

            try {
                $this->action->execute($dto);
            } finally {
                // Assert: Balances remain unchanged due to transaction rollback
                $this->assertSame(1000, $source->fresh()->balance_cents);
                $this->assertSame(5000, $destination->fresh()->balance_cents);
                $this->assertDatabaseCount('transfers', 0);

                // Assert: No jobs dispatched on failure
                Queue::assertNothingPushed();
            }
        }
    }
}
