<?php

namespace App\Dto {
    use Symfony\Component\Validator\Constraints as Assert;

    /**
     * Data Transfer Object for Post creation with validation attributes.
     */
    class CreatePostDto
    {
        #[Assert\NotBlank(message: 'Title must not be blank.')]
        #[Assert\Length(max: 255, maxMessage: 'Title cannot exceed 255 characters.')]
        public string $title;

        #[Assert\NotBlank(message: 'Content must not be blank.')]
        public string $content;

        public function __construct(string $title, string $content)
        {
            $this->title = $title;
            $this->content = $content;
        }
    }
}

namespace App\Service {
    use App\Entity\Post;
    use App\Dto\CreatePostDto;
    use Doctrine\ORM\EntityManagerInterface;

    /**
     * Service class handling Post domain persistence logic.
     */
    class PostService
    {
        private EntityManagerInterface $entityManager;

        public function __construct(EntityManagerInterface $entityManager)
        {
            $this->entityManager = $entityManager;
        }

        public function createPost(CreatePostDto $dto): Post
        {
            $post = new Post();
            $post->setTitle($dto->title);
            $post->setContent($dto->content);
            $post->setIsPublished(false);
            $post->setCreatedAt(new \DateTimeImmutable());

            $this->entityManager->persist($post);
            $this->entityManager->flush();

            return $post;
        }

        public function getPublishedPosts(): array
        {
            return $this->entityManager->createQueryBuilder()
                ->select('p', 'a')
                ->from(Post::class, 'p')
                ->leftJoin('p.author', 'a')
                ->where('p.isPublished = :published')
                ->setParameter('published', true)
                ->orderBy('p.createdAt', 'DESC')
                ->getQuery()
                ->getResult();
        }
    }
}

namespace App\Controller {
    use App\Dto\CreatePostDto;
    use App\Service\PostService;
    use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
    use Symfony\Component\HttpFoundation\JsonResponse;
    use Symfony\Component\HttpFoundation\Request;
    use Symfony\Component\Routing\Annotation\Route;
    use Symfony\Component\Validator\Validator\ValidatorInterface;

    /**
     * Example Symfony Controller demonstrating senior-level practices:
     * - Thin controllers delegating persistence to dedicated Service classes.
     * - DTO deserialization and validation using PHP 8 Attributes.
     * - Constructor dependency injection for autowired services.
     * - Doctrine QueryBuilder join fetching to prevent N+1 queries.
     * - Explicit native PHP 8+ type declarations without runtime strict_types.
     */
    class PostController extends AbstractController
    {
        private PostService $postService;

        public function __construct(PostService $postService)
        {
            $this->postService = $postService;
        }

        /**
         * Fetch published posts endpoint.
         */
        #[Route('/api/posts', name: 'app_posts_index', methods: ['GET'])]
        public function index(): JsonResponse
        {
            $posts = $this->postService->getPublishedPosts();

            $data = array_map(static function ($post): array {
                return [
                    'id' => $post->getId(),
                    'title' => $post->getTitle(),
                    'content' => $post->getContent(),
                    'author' => $post->getAuthor() ? [
                        'id' => $post->getAuthor()->getId(),
                        'name' => $post->getAuthor()->getName(),
                    ] : null,
                    'createdAt' => $post->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                ];
            }, $posts);

            return $this->json([
                'success' => true,
                'data' => $data,
            ]);
        }

        /**
         * Create post endpoint.
         */
        #[Route('/api/posts', name: 'app_posts_create', methods: ['POST'])]
        public function create(Request $request, ValidatorInterface $validator): JsonResponse
        {
            $payload = json_decode($request->getContent(), true) ?? [];

            $dto = new CreatePostDto(
                (string) ($payload['title'] ?? ''),
                (string) ($payload['content'] ?? '')
            );

            $violations = $validator->validate($dto);

            if (count($violations) > 0) {
                $errors = [];
                foreach ($violations as $violation) {
                    $errors[$violation->getPropertyPath()] = $violation->getMessage();
                }
                return $this->json([
                    'success' => false,
                    'errors' => $errors,
                ], 400);
            }

            try {
                $post = $this->postService->createPost($dto);

                return $this->json([
                    'success' => true,
                    'message' => 'Post created successfully.',
                    'data' => [
                        'id' => $post->getId(),
                        'title' => $post->getTitle(),
                    ],
                ], 201);
            } catch (\Throwable $e) {
                return $this->json([
                    'success' => false,
                    'message' => 'Failed to create post.',
                    'error' => $e->getMessage(),
                ], 500);
            }
        }
    }
}
