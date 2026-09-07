<?php

namespace App\Security\Examples;

use PDO;
use RuntimeException;
use InvalidArgumentException;

/**
 * Web Security Master Example: Vulnerable vs Secure Backend PHP Patterns
 * 
 * Demonstrates common server-side vulnerabilities (SQL Injection, Command Injection,
 * SSRF, IDOR/BOLA) and their secure implementations in modern PHP 8+.
 */
class VulnerableVsSecureBackend
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    // =========================================================================
    // 1. SQL Injection (SQLi)
    // =========================================================================

    /**
     * ❌ VULNERABLE: Direct string interpolation in SQL query
     */
    public function findUserVulnerable(string $userInput): ?array
    {
        // UNSAFE: Entering "admin' OR '1'='1" bypasses login or leaks user database
        $sql = "SELECT id, email, role FROM users WHERE username = '{$userInput}'";
        $stmt = $this->pdo->query($sql);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result !== false ? $result : null;
    }

    /**
     * ✅ SECURE: Prepared statements with explicit parameter binding
     */
    public function findUserSecure(string $userInput): ?array
    {
        // SAFE: Database treats $userInput strictly as literal scalar data, not executable SQL code
        $sql = "SELECT id, email, role FROM users WHERE username = :username";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':username', $userInput, PDO::PARAM_STR);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result !== false ? $result : null;
    }

    // =========================================================================
    // 2. Command Injection (RCE)
    // =========================================================================

    /**
     * ❌ VULNERABLE: Executing shell commands with unsanitized parameters
     */
    public function pingHostVulnerable(string $hostname): string
    {
        // UNSAFE: Entering "8.8.8.8; cat /etc/passwd" executes arbitrary system commands
        $output = shell_exec("ping -c 1 " . $hostname);
        return $output !== null ? $output : '';
    }

    /**
     * ✅ SECURE: Validating input format and escaping shell arguments
     */
    public function pingHostSecure(string $hostname): string
    {
        // SAFE OPTION A: Enforce strict format validation (IPv4 or valid domain)
        if (!filter_var($hostname, FILTER_VALIDATE_IP) && !preg_match('/^[a-zA-Z0-9.-]+$/', $hostname)) {
            throw new InvalidArgumentException("Invalid hostname or IP address provided.");
        }

        // SAFE OPTION B: Wrap parameters in escapeshellarg() to neutralize shell operators
        $escapedHost = escapeshellarg($hostname);
        $output = shell_exec("ping -c 1 " . $escapedHost);

        return $output !== null ? $output : '';
    }

    // =========================================================================
    // 3. Server-Side Request Forgery (SSRF)
    // =========================================================================

    /**
     * ❌ VULNERABLE: Fetching arbitrary URL provided by user input
     */
    public function fetchExternalImageVulnerable(string $url): string
    {
        // UNSAFE: Attacker provides "http://169.254.169.254/latest/meta-data/" or "http://localhost:6379"
        $content = file_get_contents($url);
        return $content !== false ? $content : '';
    }

    /**
     * ✅ SECURE: Scheme checking, domain whitelisting, and IP address validation
     */
    public function fetchExternalImageSecure(string $url): string
    {
        $parsedUrl = parse_url($url);
        if ($parsedUrl === false || !isset($parsedUrl['scheme'], $parsedUrl['host'])) {
            throw new InvalidArgumentException("Malformed URL.");
        }

        // 1. Enforce HTTPS scheme only
        if (strtolower($parsedUrl['scheme']) !== 'https') {
            throw new InvalidArgumentException("Only HTTPS URLs are allowed.");
        }

        $host = $parsedUrl['host'];

        // 2. Resolve DNS host to IP address
        $ip = gethostbyname($host);

        // 3. Reject Private & Loopback IP ranges (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16)
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            throw new InvalidArgumentException("Requests targeting internal networks or metadata services are forbidden.");
        }

        // 4. Fetch content using cURL without follow-redirects (disallow redirect to internal IPs)
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false); // Prevent SSRF via HTTP 302 redirects
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $httpCode !== 200) {
            throw new RuntimeException("Failed to safely fetch external resource.");
        }

        return (string) $response;
    }

    // =========================================================================
    // 4. Broken Object Level Authorization (IDOR / BOLA)
    // =========================================================================

    /**
     * ❌ VULNERABLE: Entity access without ownership verification
     */
    public function getOrderVulnerable(int $orderId): ?array
    {
        // UNSAFE: Checks database by orderId alone. Any logged-in user can view any other user's order details!
        $sql = "SELECT * FROM orders WHERE id = :id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':id', $orderId, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result !== false ? $result : null;
    }

    /**
     * ✅ SECURE: Scoping query by current authenticated user ID
     */
    public function getOrderSecure(int $orderId, int $currentUserId): ?array
    {
        // SAFE: Both order ID and authenticated user ID are enforced in query context
        $sql = "SELECT * FROM orders WHERE id = :order_id AND user_id = :user_id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':order_id', $orderId, PDO::PARAM_INT);
        $stmt->bindValue(':user_id', $currentUserId, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result !== false ? $result : null;
    }
}
