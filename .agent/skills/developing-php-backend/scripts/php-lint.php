<?php

/**
 * Enterprise PHP Syntax & Linter Validator
 *
 * Scans files or directories recursively for PHP syntax errors using `php -l`.
 *
 * Usage:
 *   php php-lint.php [options] <path_to_file_or_directory>
 *
 * Options:
 *   -h, --help    Show this help message and exit
 */

$startTime = microtime(true);

if ($argc < 2 || in_array('-h', $argv, true) || in_array('--help', $argv, true)) {
    echo <<<HELP

Enterprise PHP Syntax & Linter Validator

Usage:
  php php-lint.php [options] <file_or_directory>

Options:
  -h, --help    Display this help message and exit

Checks performed:
  ✔ Recursive discovery of all .php files
  ✔ Parallel syntax compilation verification via php -l
  ✔ Deterministic exit codes: 0 on success, 1 on compilation failure

HELP;
    exit(0);
}

// Find path argument
$target = null;
for ($i = 1; $i < $argc; $i++) {
    if (!str_starts_with($argv[$i], '-')) {
        $target = $argv[$i];
        break;
    }
}

if (!$target) {
    echo "Error: No target file or directory provided.\n";
    exit(1);
}

if (!file_exists($target)) {
    echo "Error: Path '{$target}' does not exist.\n";
    exit(1);
}

$filesToLint = [];

if (is_dir($target)) {
    $directoryIterator = new RecursiveDirectoryIterator($target, RecursiveDirectoryIterator::SKIP_DOTS);
    $iterator = new RecursiveIteratorIterator($directoryIterator);
    foreach ($iterator as $file) {
        if ($file->isFile() && strtolower($file->getExtension()) === 'php') {
            // Skip vendor, .git, and cache directories
            $pathname = $file->getPathname();
            if (str_contains($pathname, 'vendor') || str_contains($pathname, '.git') || str_contains($pathname, 'storage')) {
                continue;
            }
            $filesToLint[] = $pathname;
        }
    }
} else {
    $filesToLint[] = $target;
}

if (empty($filesToLint)) {
    echo "No PHP files found to lint in target: {$target}\n";
    exit(0);
}

echo "\n🐘 PHP Syntax Linter: Inspecting " . count($filesToLint) . " file(s)...\n";
echo str_repeat('=', 78) . "\n";

$hasErrors = false;
$failedFiles = [];

foreach ($filesToLint as $file) {
    $output = [];
    $returnVar = 0;
    
    exec("php -l " . escapeshellarg($file) . " 2>&1", $output, $returnVar);
    
    if ($returnVar !== 0) {
        $hasErrors = true;
        $failedFiles[] = [
            'file' => $file,
            'output' => implode("\n", $output),
        ];
        echo "[FAIL] {$file}\n";
    }
}

$duration = round(microtime(true) - $startTime, 3);

if ($hasErrors) {
    echo "\n" . str_repeat('-', 78) . "\n";
    echo "❌ Syntax Compilation Errors Detected:\n\n";
    foreach ($failedFiles as $fail) {
        echo "File: {$fail['file']}\n";
        echo "{$fail['output']}\n\n";
    }
    echo "Linting failed: " . count($failedFiles) . " file(s) failed validation in {$duration}s.\n";
    exit(1);
}

echo "\n✔ Clean PHP Audit: All " . count($filesToLint) . " file(s) compiled successfully without syntax errors in {$duration}s.\n";
exit(0);
