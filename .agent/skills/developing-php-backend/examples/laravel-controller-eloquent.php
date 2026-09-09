<?php

/**
 * Enterprise Laravel 11 Clean Architecture & Controller Patterns
 *
 * Demonstrates:
 * 1. Dual Transport Layer: Archetype A (Inertia Monolith) vs Archetype B (Headless REST API)
 * 2. CQS Pragmatism: Simple reads directly via Eloquent scopes; DTO + Action strictly for transactional writes
 * 3. FormRequest validation & Policy-based authorization
 * 4. Readonly DTO with PHP 8.2 constructor promotion
 * 5. Atomic DB::transaction encapsulation in Action classes
 */

namespace App\Http\Requests {
    use Illuminate\Foundation\Http\FormRequest;
    use Illuminate\Support\Facades\Gate;

    /**
     * Form Request with Policy-based authorization and strict validation rules.
     */
    class StorePostRequest extends FormRequest
    {
        public function authorize(): bool
        {
            // Explicitly verify policy permissions — never blindly return true
            return Gate::allows('create', \App\Models\Post::class);
        }

        /** @return array<string, list<string>> */
        public function rules(): array
        {
            return [
                'title'     => ['required', 'string', 'max:255'],
                'content'   => ['required', 'string'],
                'author_id' => ['required', 'integer', 'exists:users,id'],
            ];
        }
    }
}

namespace App\DTOs {
    /**
     * Readonly DTO using PHP 8.2 constructor promotion.
     * Used for Command/Write mutations to provide strongly-typed payloads to Domain Actions.
     */
    final readonly class CreatePostData
    {
        public function __construct(
            public string $title,
            public string $content,
            public int    $authorId,
        ) {}

        public static function fromRequest(\App\Http\Requests\StorePostRequest $request): self
        {
            return new self(
                title:    $request->string('title')->trim()->value(),
                content:  $request->string('content')->trim()->value(),
                authorId: (int) $request->validated('author_id'),
            );
        }
    }
}

namespace App\Actions {
    use App\DTOs\CreatePostData;
    use App\Models\Post;
    use Illuminate\Support\Facades\DB;

    /**
     * Single-responsibility Action: creates a Post inside an atomic database transaction.
     */
    final readonly class CreatePostAction
    {
        public function execute(CreatePostData $data): Post
        {
            return DB::transaction(static function () use ($data): Post {
                $post = Post::create([
                    'title'        => $data->title,
                    'content'      => $data->content,
                    'author_id'    => $data->authorId,
                    'is_published' => false,
                ]);

                // Eager-load relation to prevent N+1 queries downstream
                return $post->load('author');
            });
        }
    }
}

namespace App\Http\Controllers\Inertia {
    use App\Actions\CreatePostAction;
    use App\DTOs\CreatePostData;
    use App\Http\Requests\StorePostRequest;
    use App\Models\Post;
    use Illuminate\Http\RedirectResponse;
    use Illuminate\Routing\Controller;
    use Inertia\Inertia;
    use Inertia\Response as InertiaResponse;

    /**
     * Archetype A: Full-Stack Inertia.js Monolith Controller
     *
     * Transport rules:
     * - Reads: Return Inertia::render() directly using Eloquent scopes (CQS zero-overhead read).
     * - Writes: Delegate to Action in DB::transaction, redirect back/to_route with flash messages.
     * - Strict Rule: NEVER return response()->json() for standard Inertia page routes!
     */
    final class InertiaPostController extends Controller
    {
        public function __construct(
            private readonly CreatePostAction $createPostAction,
        ) {}

        public function index(): InertiaResponse
        {
            // CQS Read Pragmatism: No redundant DTO layer for simple reads.
            // Eloquent models provide native casts(), relations, and paginator mapping.
            $posts = Post::with('author')
                ->where('is_published', true)
                ->latest()
                ->paginate(15);

            return Inertia::render('Posts/Index', [
                'posts' => $posts,
            ]);
        }

        public function store(StorePostRequest $request): RedirectResponse
        {
            $post = $this->createPostAction->execute(
                CreatePostData::fromRequest($request)
            );

            return to_route('posts.show', $post->id)
                ->with('success', 'Запись успешно создана.');
        }
    }
}

namespace App\Http\Resources {
    use Illuminate\Http\Resources\Json\JsonResource;

    /**
     * API Resource for shaping public REST API payloads.
     */
    class PostResource extends JsonResource
    {
        /** @return array<string, mixed> */
        public function toArray(\Illuminate\Http\Request $request): array
        {
            return [
                'id'         => $this->id,
                'title'      => $this->title,
                'content'    => $this->content,
                'author'     => [
                    'id'   => $this->author?->id,
                    'name' => $this->author?->name,
                ],
                'created_at' => $this->created_at?->toIso8601String(),
            ];
        }
    }
}

namespace App\Http\Controllers\Api {
    use App\Actions\CreatePostAction;
    use App\DTOs\CreatePostData;
    use App\Http\Requests\StorePostRequest;
    use App\Http\Resources\PostResource;
    use App\Models\Post;
    use Illuminate\Http\JsonResponse;
    use Illuminate\Routing\Controller;

    /**
     * Archetype B: Headless REST API Controller
     *
     * Transport rules:
     * - Reads: Return JsonResponse shaped by JsonResource.
     * - Writes: Return JsonResponse with HTTP 201 Created and resource payload.
     */
    final class ApiPostController extends Controller
    {
        public function __construct(
            private readonly CreatePostAction $createPostAction,
        ) {}

        public function index(): JsonResponse
        {
            $posts = Post::with('author')
                ->where('is_published', true)
                ->latest()
                ->paginate(15);

            return response()->json([
                'data' => PostResource::collection($posts),
                'meta' => [
                    'total'        => $posts->total(),
                    'current_page' => $posts->currentPage(),
                    'last_page'    => $posts->lastPage(),
                ],
            ]);
        }

        public function store(StorePostRequest $request): JsonResponse
        {
            $post = $this->createPostAction->execute(
                CreatePostData::fromRequest($request)
            );

            return response()->json([
                'message' => 'Post created.',
                'data'    => new PostResource($post),
            ], 201);
        }
    }
}
