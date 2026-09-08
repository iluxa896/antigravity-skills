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

## 1. Degrees of Freedom

| Level | Area | Constraints |
| :--- | :--- | :--- |
| **High** | Architecture & Topologies | Service boundaries, cache layers (Redis/Memcached), proxy (Nginx/Traefik/Caddy). |
| **Medium** | Base Images & Intervals | Alpine vs Debian slim, healthcheck intervals (`15s`, retries `3`), network naming. |
| **Low** | Security & Log Caps | Mandatory `USER 10001`, mandatory log caps (`max-size: "10m"`, `max-file: "3"`), `tini`, no secrets in `.dockerignore`. |

---

## 2. Project Scale Matrix

| Dimension | Tier 1: Dev / MVP | Tier 2: Prod Standard | Tier 3: Enterprise |
| :--- | :--- | :--- | :--- |
| **Storage & Logs** | Bind mounts, stdout | Log rotation (10m, 3 files), named volumes | Strict caps (5m, 2 files), `tmpfs`, backup volumes |
| **Security** | Root allowed | Non-root system user | Non-root + read-only rootfs + dropped capabilities |
| **Resources** | Unlimited | Memory & CPU limits | Strict CPU/Mem quotas with reservation guarantees |

---

## 3. Mandatory Hardening Checklist

```
[ ] 1. Container Log Capping
      – logging: driver: "json-file", max-size: "10m", max-file: "3" on ALL Compose services.
[ ] 2. Stateful Log Retention
      – Configure retention for PostgreSQL WAL, MySQL binlogs, Redis AOF, Nginx logs.
[ ] 3. Non-Root User
      – Create dedicated non-root group/user in Dockerfile: USER 10001:10001.
[ ] 4. Init Signal Handling
      – Use tini or dumb-init for SIGTERM/SIGINT and zombie reaping.
[ ] 5. Healthcheck & Dependency Ordering
      – HEALTHCHECK on every stateful service; depends_on: condition: service_healthy.
[ ] 6. Build Cache & Ignore Rules
      – .dockerignore excludes: node_modules, .git, *.env, vendor, tmp/.
[ ] 7. Automated Linting
      – node .agent/skills/configuring-docker-environments/scripts/docker-security-linter.mjs --path .
```

---

## 4. Multi-Stage Build Pattern

Key mandatories shown in [Dockerfile.multi-stage](./examples/Dockerfile.multi-stage):
- `FROM ... AS builder` → install all build deps → `FROM ... AS runner` with only production artifacts.
- `RUN apk add --no-cache tini` + `ENTRYPOINT ["/sbin/tini", "--"]`.
- `addgroup -S appgroup -g 10001 && adduser -S appuser -u 10001 -G appgroup` + `USER appuser:appgroup`.
- `HEALTHCHECK --interval=30s --timeout=5s --retries=3`.

For PHP-FPM + Nginx stacks, see [Dockerfile.php-fpm-nginx](./examples/Dockerfile.php-fpm-nginx).

---

## 5. Reference Files

- **Linter Script**: [docker-security-linter.mjs](./scripts/docker-security-linter.mjs) — audits for log caps, non-root users, healthchecks.
- **Universal Compose**: [docker-compose.universal.yml](./examples/docker-compose.universal.yml) — log caps, healthchecks, Postgres volume.
- **Node Multi-Stage**: [Dockerfile.multi-stage](./examples/Dockerfile.multi-stage) — tini + non-root pattern.
- **PHP-FPM + Nginx**: [Dockerfile.php-fpm-nginx](./examples/Dockerfile.php-fpm-nginx) — PHP 8.4 + Nginx + OPcache.
- **Production Hardening**: [docker-production-hardening.md](./references/docker-production-hardening.md) — namespaces, cgroups v2, capability dropping, secrets.
- **Disk Bloat Prevention**: [container-disk-bloat-prevention.md](./resources/container-disk-bloat-prevention.md) — log rotation formulas, WAL retention.
