<?php

namespace App\Models {
    use Phalcon\Mvc\Model;

    /**
     * User Model representing users table.
     */
    class User extends Model
    {
        public int $id;
        public string $name;

        public function initialize(): void
        {
            $this->setSource('users');
        }
    }

    /**
     * Post Model representing posts table in Phalcon 5.
     */
    class Post extends Model
    {
        public int $id;
        public string $title;
        public string $content;
        public int $author_id;
        public string $is_published;
        public ?string $created_at;

        public function initialize(): void
        {
            $this->setSource('posts');

            // Establish reusable relationship to User model
            $this->belongsTo(
                'author_id',
                User::class,
                'id',
                [
                    'alias' => 'author',
                    'reusable' => true,
                ]
            );
        }
    }
}

namespace App\Controllers {
    use App\Models\Post;
    use Phalcon\Mvc\Controller;
    use Phalcon\Http\ResponseInterface;
    use Phalcon\Filter\Validation;
    use Phalcon\Filter\Validation\Validator\PresenceOf;
    use Phalcon\Filter\Validation\Validator\StringLength;

    /**
     * Example Phalcon 5 Controller demonstrating senior-level practices:
     * - Disabling template engine view rendering for REST JSON APIs.
     * - Native PHP 8+ type signatures across properties, arguments, and return types.
     * - Incoming payload validation using modern Phalcon\Filter\Validation.
     * - Secure parameter binding in queries to eliminate SQL Injection risks.
     * - Explicitly omitting runtime strict_types per project rules.
     */
    class PostController extends Controller
    {
        /**
         * Fetch active published posts.
         */
        public function indexAction(): ResponseInterface
        {
            $this->view->disable();

            // Secure bound parameters in static query find
            $posts = Post::find([
                'conditions' => 'is_published = :published:',
                'bind'       => ['published' => 'Y'],
                'order'      => 'created_at DESC',
            ]);

            $data = [];
            foreach ($posts as $post) {
                $data[] = [
                    'id' => (int) $post->id,
                    'title' => (string) $post->title,
                    'content' => (string) $post->content,
                    'author' => [
                        'id' => (int) $post->author_id,
                        'name' => $post->author ? (string) $post->author->name : 'Unknown',
                    ],
                    'created_at' => $post->created_at,
                ];
            }

            return $this->response->setJsonContent([
                'success' => true,
                'data'    => $data,
            ]);
        }

        /**
         * Create a new post.
         */
        public function storeAction(): ResponseInterface
        {
            $this->view->disable();

            $payload = (array) $this->request->getJsonRawBody(true);

            $validation = new Validation();
            $validation->add(
                'title',
                new PresenceOf(['message' => 'The title is required'])
            );
            $validation->add(
                'title',
                new StringLength([
                    'max'     => 255,
                    'message' => 'The title cannot exceed 255 characters',
                ])
            );
            $validation->add(
                'content',
                new PresenceOf(['message' => 'The content is required'])
            );

            $messages = $validation->validate($payload);

            if (count($messages) > 0) {
                $errors = [];
                foreach ($messages as $message) {
                    $errors[$message->getField()] = $message->getMessage();
                }
                return $this->response
                    ->setStatusCode(400)
                    ->setJsonContent([
                        'success' => false,
                        'errors'  => $errors,
                    ]);
            }

            try {
                $post = new Post();
                $post->title = (string) $payload['title'];
                $post->content = (string) $payload['content'];
                $post->author_id = (int) ($payload['author_id'] ?? 1);
                $post->is_published = 'N';
                $post->created_at = date('Y-m-d H:i:s');

                if ($post->save() === false) {
                    $errors = [];
                    foreach ($post->getMessages() as $message) {
                        $errors[] = $message->getMessage();
                    }
                    throw new \RuntimeException(implode(', ', $errors));
                }

                return $this->response
                    ->setStatusCode(201)
                    ->setJsonContent([
                        'success' => true,
                        'message' => 'Post created successfully.',
                        'data'    => [
                            'id' => (int) $post->id,
                            'title' => $post->title,
                        ],
                    ]);
            } catch (\Throwable $e) {
                return $this->response
                    ->setStatusCode(500)
                    ->setJsonContent([
                        'success' => false,
                        'message' => 'Failed to create post.',
                        'error'   => $e->getMessage(),
                    ]);
            }
        }
    }
}
