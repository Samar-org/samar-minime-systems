# 360ISS Headquarters Orchestration — Claude Instructions

> **Methodology:** Samar AI White Glove — **v9.1.0**
> **Hub:** `../../../00-Samar-suites/hub/` — read `CLAUDE.md`, `METHODOLOGY.md`, all
> `rules/`, and this project's `registry.yaml` row first. They are authoritative.
> **Precedence:** hub rules → declared domain rules → approved product specs → this file.
> **Stage:** BUILD
> **Live:** not deployed
> **Registry:** `hub/registry.yaml` → `headquarters-orchestration`

---

## Stack

- Language/runtime: TypeScript on Node.js 20+
- Workspace: pnpm 9, Turbo 2
- Services: Fastify API, Temporal worker, Next.js dashboard
- Data/runtime libraries: Prisma, PostgreSQL, Redis, S3-compatible evidence storage, Docker
- Headquarters boundary: scoped Supabase Auth/PostgREST transport; no service-role credential

---

## Deployment fingerprint

| | |
|---|---|
| Platform | None; intended isolated workers only, never Droplet 616230389 |
| Prod URL | none |
| Database | No owned live database; Headquarters uses Supabase project `ntdgdpkefmiffwqlzknl` through exact-scope machine identities |
| CDN / DNS | none |
| Email | none |
| Payments | none |
| Monitoring — errors | none; launch gate |
| Monitoring — uptime | none |
| Monitoring — logs | none beyond local structured logging |
| CI/CD | GitHub Actions; main builds GHCR api/worker/dashboard images but deploys nowhere |
| Auto-deploy on push? | no |
| Branch protection | no, verified 2026-11-08 |
| Rollback | Not applicable until an isolated worker target exists |

---

## Repo-specific gotchas

- **[2026-11-05]** The original Prisma schema was missing; it is reconstructed from the
  committed migration. Compare it with an authenticated database snapshot before any legacy
  Prisma deployment. See `docs/operations/orchestration-recovery.md`.
- **[2026-11-06]** Legacy API routes returned invented success and arbitrary workflow starts.
  They deliberately return unavailable until the Headquarters claim/settlement owner is live.
- **[2026-11-06]** Provider APIs do not establish a general idempotency guarantee here.
  Replayed or ambiguous work goes to reconciliation; never repeat the provider call.
- **[2026-11-08]** This repository is publicly visible. Never add runtime values or secret
  material; visibility remediation must account for dependent access before it changes.

---

## Where the docs live

- Recovery and release gates: `docs/operations/orchestration-recovery.md`
- Punch list: `PUNCH_LIST.md`
- Root overview: `README.md`
- Headquarters functional/technical specs: `Samar-org/callcenter/docs/specs/`
