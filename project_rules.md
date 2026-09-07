# Project Rules & Standards

## Coding Standards
- All PHP code must adhere to PSR-12 or PSR-PER coding standards.
- Explicit native PHP 8+ type declarations (parameter types, return types, property types) are strictly mandatory for all classes, methods, and functions.
- Do not enforce `declare(strict_types=1);` runtime rules.
- Follow senior-level clean coding practices (SOLID, DRY, KISS, thin controllers, dependency injection, and proper separation of concerns).

## Paths & Files
- Always use forward slashes `/` for file and directory paths in configuration and instructions.
- All skill configuration files must be located under `.agent/skills/`.

## Verification & Safety
- Run syntax checks (`php -l`) on all new or modified PHP files before finishing tasks.
- Ensure that helper scripts handle errors gracefully and exit with non-zero status codes on failure.
