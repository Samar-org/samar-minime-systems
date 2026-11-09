# Headquarters orchestration recovery — 2026-11-06

Owner: headquarters implementation task. Development branch only; no database migrated,
worker connected, provider call made or production deployment performed.

## 1. Source recovery

The missing Prisma schema is restored from the committed initial migration: 27 models,
13 enums, indexes, scalar SQL types and FK actions. `scripts/restore-prisma-schema.py`
reconstructs it without a database; `prisma format` normalizes the result.
Legacy text identifiers and floating USD columns are preserved, not introduced into the
new headquarters ledger. Client-side CUID defaults and `@updatedAt` supply fields absent
from existing create calls. These client defaults are a review decision, not proof of
an original lost schema. No new SQL migration is generated or applied by this recovery.
Compare against an authenticated database snapshot before deploying the recovered client.

## 2. Runtime

The existing AgentRuntime now accepts both its legacy router constructor and the options
contract used by the worker. Exports match actual imports. Every call needs a positive
budget, verifies model capacity and a conservative token-cost bound, carries a deadline,
and requests exactly one provider attempt. Recorded cost comes from returned token usage,
not the routing estimate; missing usage fails. Provider pricing and cancellation must be
validated against actual chosen providers before enabling execution.
Provider errors with uncertain billing are not retried automatically. A timeout cannot prove
that a provider charged nothing; reconcile ambiguous outcomes before retrying manually.

## 3. Temporal

Worker uses NativeConnection, activities objects and normal exported async workflows.
Type-only activity imports keep database/provider modules outside the workflow sandbox.
Activities receive explicit project/workflow/task/configured-agent/budget fields. Pipeline
errors mark workflow failure and propagate; no missing notification or metric activity is called.
Activity retries remain disabled. The Headquarters dispatcher now makes one provider attempt,
rejects replayed leases and records ambiguous billing as `uncertain`; it never treats a timeout
as zero cost. Current OpenAI/Anthropic documentation did not establish a general Messages/Chat
provider idempotency guarantee, so crash recovery marks expired attempts for human reconciliation
instead of submitting provider work again.

## 4. Remaining release gates

Execution defaults disabled. The legacy API, floating project budget and authorization model
are not the authoritative HQ tenant/budget ledger. Do not enable until the scoped HQ run
claim/settlement bridge, exact agent/policy versions, atomic reservations, audit and isolation
are verified. The new dispatcher uses only a Supabase anon key plus a separate exact-scope machine
session; it has no service-role or Prisma authority. Existing legacy consumers remain unavailable.
Artifact upload failures cannot be reported as persisted. External notification delivery is
unconfigured; in-app enqueue returns sent=false. Heuristic output scoring is explicitly not
independent QA. Credentials come only from approved runtime injection; no dotenv loading.

Strict-host-key SSH access to the intended Droplet is verified for `hqdeploy`, but that account
correctly lacks Docker and sudo. No privileged deployment unit or reverse proxy exists yet.
Cloudflare, staging identity/database, sandbox workers, monitoring and restoration remain
unverified. General deployment authorization has been received; technical gates remain.

## Local validation and source authority

Worker and eight dependency package builds passed; 65 targeted provider/router/runtime/workflow
tests passed. `scripts/check-schema-parity.py` compares the recovered client-generated SQL against
the committed migration without a database. The initial whole-repository build failed on legacy dashboard path aliases. Subsequent CI
recovery addresses compilation separately; no successful build constitutes a deployment.

Estate SOPS is the secrets source of record. Historical Doppler examples in the original scaffold
are stale and must not be used to connect this service. Only approved runtime injection is used
by recovered modules. Headquarters onboarding requires a Samar Suites binding per project, three
environments and separate SOPS metadata references. Live project synchronization and the
project/environment-scoped runtime identities still require secure provisioning and live acceptance.

## Publication and CI follow-up

Public publication explicitly approved by Samar; draft PR #1 contains the recovery. Initial
GitHub CI failed before install because setup-node pnpm caching ran before pnpm installation.
Install order now selects packageManager's pnpm 9.0.0 first. A focused orchestration-contracts
job supplements the existing whole-repository checks; those checks remain enabled and may expose
legacy scaffold failures. The original Kubernetes deployment workflow had invalid nested
expressions and did not target Droplet 616230389. It is replaced by an explicit manual-only
release preflight with read-only repository permission and no deployment or secret access.
The preflight refuses release until the actual target, ledger, vault, evidence and rollback
bridge exist. No workflow dispatch or production credential was used.

## Whole-workspace CI recovery

The initial Lint job invoked TypeScript at a root with no tsconfig and checked no code. The
Test job failed before discovery because `pnpm test --run` is not a valid pnpm invocation.
CI now calls named root scripts: typecheck builds dependency declarations and checks every
workspace configuration; test builds the package exports needed by a fresh checkout and
discovers all test files through the root Vitest version. No tests or package typechecks
are excluded to obtain a pass. The independent full build job remains enabled.

Recovered the missing dashboard TypeScript alias configuration and CSS import, completed
its referenced API client methods, aligned four project module settings with NodeNext,
declared their existing Zod dependency, and changed stale logger imports to the real owner.
This restores scaffold compilation; it does not make the legacy dashboard the approved HQ UI.

The old API imported nonexistent authentication and used Express-specific content-type
validation in Fastify. It also returned fixed invented IDs, empty business telemetry and
allowed arbitrary Temporal workflow starts. Those unavailable routes now return 503 through
a shared boundary; only liveness and explicit negative readiness are exposed. Bootstrap and
factory are separate so HTTP-injection tests run without opening a port, creating JWTs,
connecting a DB or calling Temporal. The direct legacy workflow-start helper refuses execution
until the HQ claim/settlement owner is connected. This is a deliberate blocked state, not a
new authentication implementation. Production routes must remain unavailable until accepted.

Local evidence: all 68 tests discovered across seven files pass, including three actual Fastify
HTTP-boundary cases. The dashboard production build and four project builds pass. Final
whole-workspace typecheck, GitHub CI and full build results are recorded in the PR.

The complete typecheck also exposed a previously unchecked notification module: undeclared
mail/database imports, missing input types, delivery success reported without SMTP/webhook
configuration, and read acknowledgements written into delivery timestamps. Its legacy delivery
and persistence entry points are explicitly unavailable until a project/environment-scoped
outbox and independent acknowledgement owner are connected. No SMTP or Slack call is made,
no delivery ID is fabricated, and no notification row can be changed by this module. Scoped
contracts and denial tests document this intentional remaining integration work.

Image responses are now schema-validated and malformed/refused responses raise a generic
error rather than echoing provider response text. No Gemini call was made.

Final recovery baseline: all 35 workspace TypeScript configurations checked; all 73 tests across
nine files passed through the fresh-checkout-aware root runner; dashboard production build passed.
The Headquarters increment adds fixed Auth/PostgREST transport, digest-addressed agent profiles,
actual integer-cent usage settlement, immutable S3 evidence before success, expired-attempt recovery,
and explicit uncertainty reporting. All 81 tests across 11 files, all 35 workspace TypeScript
configurations and the worker dependency build pass locally; GitHub CI remains separate evidence
on draft PR #1.

## Estate registration and nested-checkout build boundary — 2026-11-08

The repository is now registered as `headquarters-orchestration` in the Samar Suites estate and
its agent instructions are generated from methodology v9.1.0. The retired white-glove-setup and
Doppler guidance no longer controls this branch. `apps/dashboard/next.config.mjs` also makes the
dashboard own its Next.js configuration: without it, a nested checkout climbed into the parent
Call Center repository and attempted to load that unrelated Next 15 TypeScript config under Next 14.
This is build isolation only; it does not enable a worker, provider call or deployment.

## Atomic monthly-audit delivery — 2026-11-08

The dispatcher now reads only the current exact-attempt monthly work-order context, requires a
bounded JSON report with explicit measured, estimated or unavailable states, and calls the control
plane's atomic settlement/report owner. Invalid provider report output is retained in immutable
evidence and settles as a failed run with actual cost; it is never presented as a successful audit.
The worker-focused suite has 13 passing tests and control-plane migration 0029 is hosted with clear
schema lint. Live execution remains disabled until scoped identities, approved observation sources
and runtime evidence storage are provisioned and accepted.
