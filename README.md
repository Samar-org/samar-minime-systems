# Samar-Minime Systems

Multi-Agent AI Operating System — modular, production-grade system for market research, development, marketing, ads, creative production, training, CRM, and optimization.

## Architecture

3-layer model: Platform Core → Shared Modules → Project Systems

- **12 platform core packages** (auth, database, agents, routing, evaluation, prompts, workflows, observability, providers, schemas, config, projects-core)
- **16 shared modules** (research, recommendation, CRM, ads, SEO, creative, docs, training, analytics, notifications, approvals, assets, social-calendar, social-posting, campaign-manager, UI pipeline)
- **4 project systems** (ecommerce, marketplace, warehouse, client-portal)
- **3 apps** (Fastify API, Temporal worker, Next.js dashboard)

## Tech Stack

Node.js, TypeScript, Fastify, Next.js, Temporal, PostgreSQL, Prisma, Redis, Docker, S3/MinIO, Zod, Pino, Tailwind CSS

## Quick Start

```bash
bash infra/scripts/setup.sh
```

## Stats

238 files | 15,409 lines of TypeScript | 35 packages
