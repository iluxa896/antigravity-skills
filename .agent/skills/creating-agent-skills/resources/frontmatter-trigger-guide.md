# Frontmatter & Trigger Formulation Guide

The `description` property in `SKILL.md` functions as the semantic router in the Antigravity agent system. Crafting high-precision trigger descriptions is essential for ensuring that skills are activated when needed and ignored when irrelevant.

---

## 1. How Semantic Routing Works

Before a skill is loaded into active memory, the Antigravity system injects a catalog of all discovered skills into the agent's system prompt:
```text
Available skills:
- managing-postgres-mysql: Provides expert DBA workflows...
- developing-vue-frontend: Assists with modern Vue 3 frontend development...
```
The model parses user intent against this catalog. If a description lacks relevant keywords or concrete verbs, the model will not invoke the skill. Conversely, if a description is overly vague ("Helps with software development"), it will cause catastrophic false positives and pollute the context window.

---

## 2. The 3-Part Description Formula

Every skill description must contain these 3 elements within 1024 characters:

```text
[1. Role & Scope] + [2. Core Capabilities & Tech Stack] + [3. Explicit Invocation Trigger]
```

### Breakdown:
1. **Role & Scope (Third Person)**:
   - "Provides expert DBA workflows for PostgreSQL and MySQL..."
   - "Executes rigorous QA testing workflows, test planning, and edge-case audits..."
2. **Core Capabilities & Tech Stack**:
   - List key frameworks, protocols, and technical domains (e.g., "Pinia, Composition API, Vue Router, Vitest, Playwright").
3. **Explicit Invocation Trigger**:
   - Must begin with `Use when [specific triggers]`.
   - Include action verbs ("writing, refactoring, diagnosing, migrating, auditing").
   - Include typical user questions, file types, or specific commands.

---

## 3. High-Quality Trigger Examples

### Example 1: Database Engineering
```yaml
description: >-
  Provides expert DBA workflows, query tuning, indexing strategies, diagnostic queries,
  and zero-downtime migration guidelines for PostgreSQL and MySQL. Use when the user asks
  for database administration, SQL optimization, EXPLAIN ANALYZE, deadlock debugging,
  vacuuming, connection pooling, or safe schema migrations.
```

### Example 2: Frontend Engineering
```yaml
description: >-
  Assists with modern Vue 3 frontend development, creating high-converting selling designs,
  modern UI/UX aesthetics, and ultra-secure enterprise-grade Vue applications. Enforces Composition
  API, TypeScript, Pinia state management, DOM XSS prevention, Vue Router guards, performance
  optimization, and accessibility. Use when building, styling, or refactoring Vue components,
  designing high-converting landing pages/dashboards, or auditing Vue frontend code.
```

### Example 3: Infrastructure / Docker
```yaml
description: >-
  Expert skill for crafting production-ready Dockerfiles and docker-compose setups
  tailored to project scale (Dev, Staging, Enterprise/Prod). Evaluates project requirements,
  prevents container disk space bloat (Docker log capping, stateful WAL/journal/binlog rotation),
  enforces security hardening (non-root users, multi-stage builds), and configures healthchecks
  and resource quotas for any technology stack. Use when the user asks to write, optimize,
  or configure Docker, Dockerfiles, or docker-compose environments.
```

---

## 4. Anti-Patterns & Common Traps

| Bad Description | Problem | Better Alternative |
| :--- | :--- | :--- |
| `Helps write good Python code.` | Far too generic; lacks tech stack, triggers, and capabilities. | `Guides Python 3.12+ development with FastAPI, Pydantic v2, and async architecture. Use when building REST APIs, optimizing async IO, or writing pytest suites.` |
| `I can help you build Docker containers for your projects.` | Written in first person ("I can help"); lacks triggers. | `Expert skill for crafting production-ready Dockerfiles... Use when configuring Docker or docker-compose.` |
| `Runs every time code is written.` | Over-triggering; floods context. | Target specific operations (e.g., refactoring, testing, security review). |
