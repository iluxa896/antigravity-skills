---
name: configuring-docker-environments
description: >-
  Expert skill for crafting production-ready Dockerfiles, docker-compose setups, and container
  security hardening tailored to project scale. Prevents disk space bloat (log capping, WAL/binlog
  rotation), enforces non-root users (USER 10001), multi-stage builds, init signal handling (tini),
  healthchecks, and resource quotas. Use when creating or refactoring Dockerfiles, configuring
  docker-compose.yml, auditing container security, or setting up deployment stacks.
---

# Configuring Docker Environments

## When to use this skill
- Writing or refactoring `Dockerfile`, `docker-compose.yml`, or `.dockerignore`.
- Assessing project scale to select appropriate container architecture.
- Preventing disk bloat: log runaway, uncontrolled WAL/binlog, or build cache leaks.
- Implementing multi-stage builds, layer caching, non-root users, and init signal handling.
- Setting up healthchecks, dependency ordering, and resource quotas.

---

## 1. Container Role Archetypes Matrix

Do not apply monolithic rules blindly across different container roles. Match hardening requirements strictly to the container archetype:

| Archetype | Container Purpose | Non-Root User | Multi-Stage | Init (`tini`) | Healthcheck | Compose Sequencing |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **App Runtime** | PHP-FPM, Node.js, Go, Python apps | **Mandatory** (`USER 10001:10001`) | **Mandatory** (`AS builder` → `AS runner`) | **Mandatory** (catches SIGTERM, reaps zombies) | **Mandatory** (`cgi-fcgi` or HTTP `/health`) | `depends_on: condition: service_healthy` |
| **Edge Gateway** | Nginx, Traefik, Caddy reverse proxies | **Master as root** (for ports 80/443 & Certbot cron); workers drop to `nginx:nginx` | Optional (single-stage standard image) | **Not needed** (Nginx master is its own supervisor) | Compose-level HTTP probe or disabled for custom vhosts | `depends_on: app: condition: service_healthy` |
| **Ephemeral Init / Job** | DB migrations, seeders, auth keygen, `*.init` | Root or appuser depending on mount permissions | **Not needed** (ephemeral scripts, no build tools) | Optional (synchronous bash scripts) | **FORBIDDEN** (breaks orchestrators; runs to completion) | `depends_on: condition: service_completed_successfully` |
| **Queue / Daemon** | `queue:work`, Celery, background crons | **Mandatory** (`USER 10001:10001`) | Inherited (`target: runner`) | **Mandatory** (graceful shutdown on deployment) | `healthcheck: disable: true` or file heartbeat | `depends_on: redis: condition: service_healthy` |

---

## 2. Degrees of Freedom

| Level | Area | Constraints |
| :--- | :--- | :--- |
| **High** | Architecture & Topologies | Service boundaries, cache layers (Redis/Memcached), proxy (Nginx/Traefik/Caddy). |
| **Medium** | Base Images & Intervals | Alpine vs Debian slim, healthcheck intervals (`15s`, retries `3`), network naming. |
| **Low** | Security & Log Caps | Mandatory `USER 10001` on App Runtimes, mandatory log caps (`max-size: "10m"`, `max-file: "3"`), `tini` on runtimes, no secrets in `.dockerignore`. |

---

## 3. Project Scale Matrix

| Dimension | Tier 1: Dev / MVP | Tier 2: Prod Standard | Tier 3: Enterprise |
| :--- | :--- | :--- | :--- |
| **Storage & Logs** | Bind mounts, stdout | Log rotation (10m, 3 files), named volumes | Strict caps (5m, 2 files), `tmpfs`, backup volumes |
| **Security** | Root allowed | Non-root system user (App runtimes) | Non-root + read-only rootfs + dropped capabilities |
| **Resources** | Unlimited | Memory & CPU limits | Strict CPU/Mem quotas with reservation guarantees |

---

## 4. Node.js & V8 Container Memory Allocation

When running memory-intensive build tools (Vite, Webpack, Nuxt, Next.js) inside resource-bounded containers, V8 engine defaults may trigger premature garbage collection failure (`FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`).
- **Rule**: Explicitly allocate Node heap memory proportional to the container limit:
  ```bash
  NODE_OPTIONS="--max-old-space-size=2048" npm run build
  ```
- In automated scripts or Docker commands:
  ```yaml
  environment:
    - NODE_OPTIONS=--max-old-space-size=2048
  ```

---

## 5. Mandatory Hardening Checklist

```
[ ] 1. Container Log Capping
      – logging: driver: "json-file", max-size: "10m", max-file: "3" on ALL Compose services.
[ ] 2. Stateful Log Retention
      – Configure retention for PostgreSQL WAL (max_wal_size), MySQL binlogs, Redis AOF, Nginx logs.
[ ] 3. Container Role Matching
      – App Runtime: USER 10001:10001, tini init, multi-stage, HEALTHCHECK.
      – Edge Gateway (Nginx): Master as root (ports 80/443), worker drops to nginx user, no tini.
      – Ephemeral Init: Zero HEALTHCHECK, orchestrate via condition: service_completed_successfully.
      – Queue Worker: Inherits runner image, tini for graceful SIGTERM shutdown, disable unused HTTP healthchecks.
[ ] 4. Init Signal Handling
      – Use tini or dumb-init for application runtimes to catch SIGTERM and reap child zombies.
[ ] 5. Healthcheck & Dependency Sequencing
      – HEALTHCHECK on stateful and runtime services; depends_on: condition: service_healthy.
      – Ephemeral init containers use condition: service_completed_successfully.
[ ] 6. Build Cache & Ignore Rules
      – .dockerignore excludes: node_modules, .git, *.env, vendor, tmp/.
[ ] 7. Automated Linting
      – node .agent/skills/configuring-docker-environments/scripts/docker-security-linter.mjs --path .
```


---

## 6. Multi-Stage Build Pattern

Key mandatories shown in [Dockerfile.multi-stage](./examples/Dockerfile.multi-stage):
- `FROM ... AS builder` → install all build deps → `FROM ... AS runner` with only production artifacts.
- `RUN apk add --no-cache tini` + `ENTRYPOINT ["/sbin/tini", "--"]`.
- `addgroup -S appgroup -g 10001 && adduser -S appuser -u 10001 -G appgroup` + `USER appuser:appgroup`.
- `HEALTHCHECK --interval=30s --timeout=5s --retries=3`.

For PHP-FPM + Nginx stacks, see [Dockerfile.php-fpm-nginx](./examples/Dockerfile.php-fpm-nginx).

---

## 7. Reference Files

- **Linter Script**: [docker-security-linter.mjs](./scripts/docker-security-linter.mjs) — audits for log caps, non-root users, healthchecks.
- **Universal Compose**: [docker-compose.universal.yml](./examples/docker-compose.universal.yml) — log caps, healthchecks, Postgres volume.
- **Node Multi-Stage**: [Dockerfile.multi-stage](./examples/Dockerfile.multi-stage) — tini + non-root pattern.
- **PHP-FPM + Nginx**: [Dockerfile.php-fpm-nginx](./examples/Dockerfile.php-fpm-nginx) — PHP 8.4 + Nginx + OPcache.
- **Production Hardening**: [docker-production-hardening.md](./references/docker-production-hardening.md) — namespaces, cgroups v2, capability dropping, secrets.
- **Disk Bloat Prevention**: [container-disk-bloat-prevention.md](./resources/container-disk-bloat-prevention.md) — log rotation formulas, WAL retention.

