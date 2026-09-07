<?php

namespace App\Http\Requests {
    use Illuminate\Foundation\Http\FormRequest;

    /**
     * Form Request encapsulating request validation & authorization rules for post creation.
     */
    class StorePostRequest extends FormRequest
    {
        public function authorize(): bool
        {
            return true;
        }

        public function rules(): array
        {
            return [
                'title' => 'required|string|max:255',
                'content' => 'required|string',
                'author_id' => 'required|integer|exists:users,id',
            ];
        }
    }
}

namespace App\Http\Resources {
    use Illuminate\Http\Resources\Json\JsonResource;

    /**
     * API Resource for structuring and serializing Post model data.
     */
    class PostResource extends JsonResource
    {
        public function toArray($request): array
        {
            return [
                'id' => (int) $this->id,
                'title' => (string) $this->title,
                'content' => (string) $this->content,
                'author' => [
                    'id' => (int) $this->author->id,
                    'name' => (string) $this->author->name,
                ],
                'created_at' => $this->created_at?->toIso8601String(),
            ];
        }
    }
}

namespace App\Actions {
    use App\Models\Post;
    use Illuminate\Support\Facades\DB;

    /**
     * Dedicated Action class handling post creation domain logic within a DB transaction.
     */
    class CreatePostAction
    {
        public function execute(array $data): Post
        {
            return DB::transaction(function () use ($data): Post {
                return Post::create([
                    'title' => $data['title'],
                    'content' => $data['content'],
                    'author_id' => $data['author_id'],
                    'is_published' => false,
                ]);
            });
        }
    }
}

namespace App\Http\Controllers {
    use App\Models\Post;
    use App\Actions\CreatePostAction;
    use App\Http\Requests\StorePostRequest;
    use App\Http\Resources\PostResource;
    use Illuminate\Http\JsonResponse;
    use Illuminate\Routing\Controller;

    /**
     * Example Laravel Controller demonstrating senior-level practices:
     * - Native PHP 8+ type declarations (properties, parameters, return types).
     * - Thin controllers delegating domain logic to Action classes.
     * - Request validation using Form Requests and formatting via API Resources.
     * - Eager loading relationships (`with('author')`) to eliminate N+1 queries.
     * - No runtime 'strict_types' declaration per project guidelines.
     */
    class PostController extends Controller
    {
        /**
         * Fetch paginated posts with author relation preloaded.
         */
        public function index(): JsonResponse
        {
            // Eager load 'author' to prevent N+1 query bottleneck
            $posts = Post::with('author')
                ->where('is_published', true)
                ->orderBy('created_at', 'desc')
                ->paginate(15);

            return response()->json([
                'success' => true,
                'data' => PostResource::collection($posts),
            ], 200);
        }

        /**
         * Create a new post delegating to StorePostRequest and CreatePostAction.
         */
        public function store(StorePostRequest $request, CreatePostAction $action): JsonResponse
        {
            try {
                // Form Request guarantees array data is validated
                $post = $action->execute($request->validated());

                return response()->json([
                    'success' => true,
                    'message' => 'Post created successfully.',
                    'data' => new PostResource($post),
                ], 201);
            } catch (\Throwable $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create post.',
                    'error' => $e->getMessage(),
                ], 500);
            }
        }
    }
}
