# Headquarters orchestration recovery — 2026-11-05

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
Activity retries are disabled until durable provider request idempotency is accepted.

## 4. Remaining release gates

Execution defaults disabled. The legacy API, floating project budget and authorization model
are not the authoritative HQ tenant/budget ledger. Do not enable until the scoped HQ run
claim/settlement bridge, exact agent/policy versions, atomic reservations, audit and isolation
are verified. Existing integration consumers require the new explicit task contract.
Artifact upload failures cannot be reported as persisted. External notification delivery is
unconfigured; in-app enqueue returns sent=false. Heuristic output scoring is explicitly not
independent QA. Credentials come only from approved runtime injection; no dotenv loading.

Server access remains absent and the DigitalOcean browser console returns Site Unavailable.
Cloudflare, staging identity/database, sandbox workers, monitoring and restoration remain
unverified. General deployment authorization has been received; technical gates remain.

## Local validation and source authority

Worker and eight dependency package builds passed; 65 targeted provider/router/runtime/workflow
tests passed. `scripts/check-schema-parity.py` compares the recovered client-generated SQL against
the committed migration without a database. The full 35-package build still fails on legacy
dashboard path aliases; this recovery is not a full application build or deployment.

Estate SOPS is the secrets source of record. Historical Doppler examples in the original scaffold
are stale and must not be used to connect this service. Only approved runtime injection is used
by recovered modules. Headquarters onboarding requires a Samar Suites binding per project, three
environments and separate SOPS metadata references. Live project synchronization and the
project/environment-scoped run and secret-injection bridge remain unimplemented release gates.
