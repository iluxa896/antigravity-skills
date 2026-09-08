<?php

namespace App\Dto {
    use Symfony\Component\Validator\Constraints as Assert;

    /**
     * Immutable DTO using PHP 8.1 readonly constructor promotion + Attribute validation.
     */
    readonly class CreatePostDto
    {
        public function __construct(
            #[Assert\NotBlank(message: 'Title must not be blank.')]
            #[Assert\Length(max: 255, maxMessage: 'Title cannot exceed 255 characters.')]
            public string $title,

            #[Assert\NotBlank(message: 'Content must not be blank.')]
            public string $content,
        ) {}
    }
}

namespace App\Service {
    use App\Dto\CreatePostDto;
    use App\Entity\Post;
    use Doctrine\ORM\EntityManagerInterface;

    /**
     * Domain service responsible for Post persistence.
     * Uses readonly constructor promotion (PHP 8.1) for clean DI.
     */
    class PostService
    {
        public function __construct(
            private readonly EntityManagerInterface $em,
        ) {}

        public function createPost(CreatePostDto $dto): Post
        {
            $post = new Post();
            $post->setTitle($dto->title);
            $post->setContent($dto->content);
            $post->setIsPublished(false);
            $post->setCreatedAt(new \DateTimeImmutable());

            $this->em->persist($post);
            $this->em->flush();

            return $post;
        }

        /** @return Post[] */
        public function getPublishedPosts(): array
        {
            // JOIN FETCH on author prevents N+1 queries
            return $this->em->createQueryBuilder()
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
    use Symfony\Component\Routing\Attribute\Route;
    use Symfony\Component\Validator\Validator\ValidatorInterface;

    /**
     * Symfony 7 thin controller: deserialize → validate → service → respond.
     * Uses #[Route] attribute (Symfony 6.2+) and readonly constructor promotion.
     */
    #[Route('/api/posts')]
    class PostController extends AbstractController
    {
        public function __construct(
            private readonly PostService $postService,
        ) {}

        #[Route('', name: 'app_posts_index', methods: ['GET'])]
        public function index(): JsonResponse
        {
            $posts = $this->postService->getPublishedPosts();

            $data = array_map(static fn($post): array => [
                'id'        => $post->getId(),
                'title'     => $post->getTitle(),
                'author'    => $post->getAuthor()?->getName(),
                'createdAt' => $post->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            ], $posts);

            return $this->json(['data' => $data]);
        }

        #[Route('', name: 'app_posts_create', methods: ['POST'])]
        public function create(Request $request, ValidatorInterface $validator): JsonResponse
        {
            $payload = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

            $dto = new CreatePostDto(
                title:   (string) ($payload['title'] ?? ''),
                content: (string) ($payload['content'] ?? ''),
            );

            $violations = $validator->validate($dto);
            if (count($violations) > 0) {
                $errors = [];
                foreach ($violations as $v) {
                    $errors[$v->getPropertyPath()] = $v->getMessage();
                }
                return $this->json(['errors' => $errors], 422);
            }

            $post = $this->postService->createPost($dto);

            return $this->json([
                'message' => 'Post created.',
                'data'    => ['id' => $post->getId(), 'title' => $post->getTitle()],
            ], 201);
        }
    }
}
