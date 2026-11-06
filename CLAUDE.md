# samar-minime-systems -- Claude Instructions

This repo follows the **Samar AI White Glove Project** -- canonical methodology at https://github.com/Samar-org/white-glove-setup
Read methodology/ from that repo before doing any work.
## First-session setup

On your first session in this repo, fetch and read the methodology files from the central repo:

1. Read `methodology/00-operating-mode.md` through `methodology/07-secrets-management.md` from `Samar-org/white-glove-setup`
2. Follow all rules defined there — they are authoritative
3. Use this file for repo-specific context only

---

## Repo-specific stack

<!-- Fill in the actual stack for this project -->

- **Framework:** TypeScript, pnpm, Turbo, Fastify, Next.js, Temporal, PostgreSQL, Prisma, Redis, Docker
- **Hosting:** none
- **Database:** none
- **Auth:** see repo code
- **Payments:** none
- **Other services:** see repo code

---

## Repo-specific business memory

<!-- What does this project do? Who is it for? Key business rules. -->

- **Project:** Samar MiniMe Systems
- **Business:** personal
- **Users:** see project docs
- **Key business rules:**
  - see project docs
  - see project docs

---

## Repo-specific gotchas

<!-- Known quirks, legacy decisions, things that will surprise a new contributor. -->

- none documented yet
- none documented yet

---

## Project stage

Current stage: **BUILD** (see [Samar-org/white-glove-setup → projects/registry.yaml](https://github.com/Samar-org/white-glove-setup/blob/master/projects/registry.yaml))

Security posture: Phase 1 -- speed over ceremony, shortcuts tracked in PUNCH_LIST.md

## Deployment fingerprint

<!-- Populated from registry.yaml. Update there, not here. -->

| Layer | Value |
|-------|-------|
| **Platform** | none |
| **Prod URL** | none |
| **Database** | none (secret: `none`) |
| **CDN/DNS** | none |
| **Email** | none |
| **Payments** | none |
| **Monitoring** | errors: none, uptime: none, logs: none |
| **CI/CD** | none, branch protection: false |

---

## Secrets

The estate **SOPS + age vault in `Samar-org/samar-suites` is the source of record**.

- Runtime identities are delivered only through the approved project/environment-scoped injection process.
- Never decrypt vaults for inspection, copy an age private key to a server, or create plaintext `.env` files.
- Headquarters workers require a distinct Supabase Auth identity for exactly one project/environment; they never receive a service-role key.
- Provider, evidence-store and machine credentials remain separate owners and are not synchronized into an application database.
- Historical Doppler references from the original scaffold are retired and must not be used for this repository.

---

## Repo-specific context

<!-- Preserved from existing repo documentation. Do not overwrite — append only. -->
