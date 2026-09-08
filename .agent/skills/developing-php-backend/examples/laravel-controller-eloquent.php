<?php

namespace App\Http\Requests {
    use Illuminate\Foundation\Http\FormRequest;
    use Illuminate\Support\Facades\Gate;

    /**
     * Form Request with Policy-based authorization and strict validation.
     */
    class StorePostRequest extends FormRequest
    {
        public function authorize(): bool
        {
            // Explicitly check policy — never blindly return true
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
     * Readonly DTO using PHP 8.1 constructor promotion.
     */
    readonly class CreatePostData
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

namespace App\Http\Resources {
    use Illuminate\Http\Resources\Json\JsonResource;

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
                    'id'   => $this->author->id,
                    'name' => $this->author->name,
                ],
                'created_at' => $this->created_at?->toIso8601String(),
            ];
        }
    }
}

namespace App\Actions {
    use App\DTOs\CreatePostData;
    use App\Models\Post;
    use Illuminate\Support\Facades\DB;

    /**
     * Single-responsibility Action: creates a Post inside an atomic transaction.
     */
    class CreatePostAction
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

                // Eager-load author to prevent N+1 on the returned resource
                return $post->load('author');
            });
        }
    }
}

namespace App\Http\Controllers {
    use App\Actions\CreatePostAction;
    use App\DTOs\CreatePostData;
    use App\Http\Requests\StorePostRequest;
    use App\Http\Resources\PostResource;
    use App\Models\Post;
    use Illuminate\Http\JsonResponse;
    use Illuminate\Routing\Controller;

    /**
     * Laravel 11 thin controller: validate → DTO → Action → Resource.
     * No business logic here — only input mapping and response shaping.
     */
    class PostController extends Controller
    {
        public function __construct(private readonly CreatePostAction $createPostAction) {}

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
