# Enterprise Docker Production Hardening & Container Security

This architectural reference provides system-level guidance on container isolation, capability dropping, Linux namespaces, and resource quota enforcement.

---

## 1. Non-Root Execution & User Namespaces

Running as root inside a container grants root privileges on the host if a container breakout vulnerability occurs.

### Security Directives
1. **Explicit System User & Group Creation**:
   ```dockerfile
   RUN addgroup -S appgroup -g 10001 && \
       adduser -S appuser -u 10001 -G appgroup
   USER appuser:appgroup
   ```
2. **File Ownership**: Only files requiring write permissions at runtime (e.g. `/tmp`, `/var/run/php`) should be writable by `appuser`. The application codebase should remain read-only where possible.

---

## 2. Linux Capabilities & Least Privilege

Containers inherit default Linux capabilities (`CAP_NET_RAW`, `CAP_MKNOD`, etc.) that web processes never need.

### Docker Compose Capability Hardening
```yaml
services:
  api:
    image: my-app:latest
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE # Only if binding to ports < 1024
    security_opt:
      - no-new-privileges:true
```

---

## 3. Read-Only Root Filesystem & Tmpfs Mounts

Prevent attackers from modifying application binaries or writing malware scripts:

```yaml
services:
  api:
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
      - /var/run:rw,noexec,nosuid,size=16m
```

---

## 4. Container Resource Quotas (cgroups v2)

Prevent memory exhaustion (OOM cascades) and CPU starvation from impacting neighboring containers or host processes:

```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 1024M
    reservations:
      memory: 256M
```

---

## 5. Secret Management: Environment Variables vs Docker Secrets

| Method | Security Posture | Risk | Recommendation |
| :--- | :--- | :--- | :--- |
| **`environment:` in compose** | Poor | Visible via `docker inspect`, leaked in crash dumps/child processes | Development only |
| **`.env` files** | Moderate | Prone to accidental Git commits | Exclude in `.gitignore` & `.dockerignore` |
| **Docker Secrets (`/run/secrets`)** | Enterprise | Mounted as in-memory files in `tmpfs`, unreadable outside container | **Production Standard** |

---

## 6. Container Role Alignment & Node.js V8 Memory Quotas

### Role Alignment (Pragmatic Hardening)
- **App Runtimes (Node, PHP-FPM, Python, Go)**: Enforce strict `USER 10001:10001`, multi-stage builds, `tini` signal handling, and healthchecks.
- **Edge Gateways (Nginx, Traefik)**: Allow master to start as `root` for low port binding (80/443) and Certbot cron; workers drop to unprivileged `nginx:nginx`. Do not wrap Nginx in `tini` (Nginx is its own signal supervisor).
- **Ephemeral Inits (`*.init`, `migrate`)**: Single-stage, run-to-completion (`service_completed_successfully`). **Never attach a HEALTHCHECK** to an ephemeral container.

### Node.js / V8 Heap Management
V8's default heap limit is approximately 1.4 GB (64-bit) or 700 MB (32-bit), but inside cgroups it may fail to adjust before hit by the Linux OOM-killer or fail prematurely during Vite/Webpack production builds:
```bash
# Allocate explicit heap limit matching container memory quota:
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```
In Docker Compose:
```yaml
environment:
  - NODE_OPTIONS=--max-old-space-size=2048
```

