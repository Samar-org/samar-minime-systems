<!-- GENERATED FILE — DO NOT EDIT.
     Source: ../../../00-Samar-suites/hub/CLAUDE.md
     Regenerate: python ../../../00-Samar-suites/hub/agents/generate.py --repo <this repo>
     Edits here are overwritten and will fail CI (generate.py --check). -->

# AGENTS.md — 360ISS Headquarters Orchestration

**Methodology:** Samar AI White Glove v9.1.0 · **Stage:** BUILD · **Live:** not deployed

> Identical rules to `CLAUDE.md` in this repo. The filenames support different agent-file
> discovery conventions; neither assigns ownership to a tool. **Do not let them drift** — both are generated from
> `hub/CLAUDE.md`.

## Central standards contract

Load **all** standards from `../../../00-Samar-suites/hub/rules/` plus every registry-declared domain below.
Never copy central standards into this repository; future hub additions apply without
editing this file.

### Truth & advice — non-negotiable (`hub/rules/09`, full text there)

1. **Truth above agreement.** Never agree because Samar suggested it, never praise weak work.
   If an idea is weak, risky or unlikely to work, say so and recommend the better one.
2. **Never invent.** No invented facts, statistics, research, competitor data, costs,
   timelines, capabilities, sources or legal requirements. **Never claim a file, tool, command
   or model was used unless it actually was.** Label anything uncertain as an assumption or a
   hypothesis — never as a fact.
3. **Do not waste time.** Lead with the conclusion, highest-impact action first. No fluff, no
   generic advice, no ten weak ideas instead of one strong one. A question answerable from the
   files is work you have not done yet.
4. **Every recommendation is actionable:** what is wrong · why it matters · what changes ·
   exactly how · benefit · risk · priority · effort · measurement · next action.
5. **Never guarantee an outcome that cannot be guaranteed.** Give the strongest realistic
   strategy, the conditions for success, and the evidence needed.
6. **Default response order:** direct verdict → evidence → best recommendation → risks → exact
   next action.

## Conditional rules — domains

This repo declares **no domains** in `hub/registry.yaml`, so no `hub/domains/` file applies. `hub/rules/` applies in full, as everywhere.

## Read order — first session in any repo

1. **This file**, top to bottom.
2. `hub/registry.yaml` → find your repo → note its **stage** (§9). The stage decides what
   you may do.
3. `hub/DECISIONS.md` → last five entries. What changed recently, and what it replaced.
4. The repo's own `CLAUDE.md` → repo-specific facts only.
5. `hub/rules/` → when you need depth on a specific area. **All of them apply everywhere.**
6. `hub/domains/<name>.md` → **only** the ones this repo's registry entry lists under
   `domains:`. Conditional rule sets — authoritative where they apply, absent where they
   don't. (§12)
   Native delivery work also loads the playbook and acceptance template linked by `mobile-product`.
7. `hub/METHODOLOGY.md` → the full process, pipeline, and rationale.

**If the repo's `CLAUDE.md` pins a version older than v4.3.0 — say so before doing any
work.** Do not silently follow a stale file.

---

## Precedence — which document wins

Read order is not authority order. When two documents disagree, this is the ranking.
**1 beats 2 beats 3 beats 4. A lower entry never overrides a higher one.**

| # | Document | Scope | On conflict |
|---|---|---|---|
| **1** | `hub/CLAUDE.md` + `hub/rules/` | **How we work.** Global, no exceptions. | Wins over everything. |
| **2** | `hub/domains/<name>.md` | Same authority, narrower — only for the domains a repo's registry entry lists. | Wins over 3 and 4 inside its domain. |
| **3** | Product / master docs | **What to build** — domain truth, specs, ownership maps. | Wins over the repo's `CLAUDE.md`. |
| **4** | The repo's own `CLAUDE.md` | Repo facts only: stack, deployment fingerprint, gotchas. | Loses to all of the above. |

Two things this ranking settles that were previously ambiguous:

- **Hub vs master docs.** The hub never loses. A master doc that contradicts a hub rule is
  describing the product, not licensing a different way of working.
- **Master docs vs a repo's `CLAUDE.md`.** The master docs win — a repo file that
  contradicts them is stale and is what gets fixed.

`hub/registry.yaml` is not in this ladder because it is not advice: it is the **fact table**
(stage, platform, database, repo). A document contradicting the registry is wrong about a
fact — verify against disk and fix the document.

**Never resolve a conflict silently.** Say which two documents disagree, apply this ladder,
and fix the lower one in the same task.

---

## The five non-negotiables

Everything below expands these. If you remember nothing else:

1. **One concern, one owner.** Everything else calls the owner. (§2)
2. **Single writer per table.** A raw write outside the owning module is a bug, and CI
   rejects it. (§3)
3. **Every mutation is named, atomic, and audited.** (§5)
4. **If it's true for more than one repo, it doesn't belong in that repo's file.** (§12)
5. **Reverse-engineer before trusting any document — including this one.** Code is what's
   running. Docs describe intent. When they disagree, the code wins and the doc gets
   fixed in the same task.

**Multi-computer gate:** before any repository work, run `git fetch --all --prune`, compare
local `HEAD` with the intended upstream branch, and start from the latest remote commit. Preserve
unrelated local work; use a clean worktree rather than overwriting, resetting, stashing, merging,
or rebasing someone else's changes. Fetch again before shipping a long-running task.

## Estate surface ownership

`customer.4more.ca` is not a separate repository. It is the in-store customer kiosk surface
owned by `Samar-org/4more-Ecosystem`, implemented under `src/app/(sites)/customer/`, and
deployed by that repository's Vercel production project when `main` is updated. Kiosk idle
screens, pickup flows, and customer shopping behavior must be changed, tested, and deployed
through `4more-Ecosystem`; agents must not create or search for a separate customer-kiosk repo.

---

## 1. Single Ownership — the method

**Every artifact has exactly one active owner. No shared ownership. No overlap. Ever.**
Ownership is assigned per task or artifact, not permanently by tool. Samar may use any
capable AI agent, coding tool, browser automation tool, CLI, IDE, or manual workflow for
any task. No methodology rule may require or prohibit a named tool. The active owner must
still obey the same scope, capability, approval, security, stage, secrets, deployment,
documentation, and quality gates.

### 1.1 System ownership

| System | Owns | Never does |
|---|---|---|
| **Samar** | Decisions — brief, priorities, architecture tradeoffs, go-live call | Implementation, file management, debugging |
| **Any capable tool or agent** | Any assigned work — orchestration, strategy, specs, implementation, tests, migrations, CI, git, deployment, browser operations, documentation, design support, and scheduled checks | Nothing solely because of tool identity; capability and universal gates still apply |
| **Samar Suites (product)** | 100% of sales & marketing execution for every project | Product features. Projects never build their own marketing code. |
| **Samar Suites (`hub/`)** | Methodology, registry, estate tooling, secrets vault | Anything project-specific |
| **Figma** | **The design system — source of truth for all visual design.** Tokens, components, page designs. (§10) | Ship code |

**Project registration is mandatory.** Any new estate project must be added to Samar Suites through `hub/registry.yaml` before work starts, with its complete project information kept current in the registry, project `CLAUDE.md`, deployment fingerprint, domain declarations, and required estate indexes or documentation. A project is not registered until those records are updated together and the sync/estate checks pass.

**Assign one active owner per task. Any capable tool or agent is eligible.** If a task has
no owner, the current agent claims it or flags it to Samar.

> **RETIRED 2026-07-22 — the 4more-bridge.** Agents communicate directly. Any
> document still describing the `inbox/`/`outbox/` bridge is stale; fix it on sight.
> *(DECISION-003)*

### 1.2 Document ownership

One owner, one writer, per document.

| Document | Owner |
|---|---|
| `README.md` `ARCHITECTURE.md` `DEPLOYMENT.md` `CLAUDE.md` `CHANGELOG.md` `PUNCH_LIST.md` `SECURITY.md` | Assigned implementation owner; any capable tool is eligible |
| `SPEC.md` | Project-assigned spec author; one writer per spec |
| `00_BRIEF.md` | Samar |
| `hub/*` | Assigned owner; any capable tool is eligible |

**AI updates docs in the same change as the code. A code change without a doc update is
incomplete work.**

---

## 2. The one architectural rule everything else serves

> ### One concern, one owner. Everything else calls the owner.

**If a piece of state can be written from many places, it will drift.** Not might — will.
The fix is always the same shape:

> A single module owns the writes → exposes **named operations** → fires all side effects
> **internally** → everyone else calls it. No exceptions. No "just this once" raw write.

This is the rule that produced every other rule in this section. Each of the anti-patterns
in §7 is a specific way this rule got broken, and each one cost real debugging time in a
real Samar codebase.

### Worked examples — these are proof, not illustrations

**4more UCP**

| Owned state | Sole writer |
|---|---|
| `inventory_pools.qty_*` | `pool_counter_service` |
| `inventory_allocations` | `allocation_service_v2` |
| Sale entry, all channels | `pool_linkage` |

**Bidding Fever** — enforced by `scripts/check-architecture.mjs` (`npm run check:arch`,
baseline `scripts/arch-allowlist.json == []`)

| Owned state | Sole writer |
|---|---|
| `Invoice.status` | `src/lib/payments/invoice-status.ts` |
| `Lot` bid state / `Bid` rows / `BID_PLACED` | `src/lib/bidding/bid-engine.ts` |
| `BuyerReliabilityScore` | `src/lib/trust/score-actions.ts` |
| User moderation | `src/lib/trust/user-moderation.ts` |
| Webhook idempotency | `src/lib/webhooks/idempotency.ts` |

**Every repo declares its own map (§4) and enforces it in CI (§8).** These two do. As of
2026-08-16, no other repo in the estate does — that's the gap this file closes.

---

## 3. Core architectural principles

- **Single writer per concern.** Every table has exactly one module that writes to it.
  Everything else reads through that module's API. Raw INSERT/UPDATE on an owned table
  outside its owner is **forbidden and CI-enforced**.

- **One module owns one domain.** Auth, payments, listings, notifications, bidding,
  inventory — each lives in exactly one module. **No cross-module writes.**

- **Contracts between modules, not reach-ins.** Modules talk via typed functions or API
  routes. **Never import another module's internals.**

- **Derive, don't store, anything that can drift.** If a value can be computed from
  authoritative state, compute it. A stored copy is a second source of truth that will
  disagree eventually.
  *Worked example: sellability is derived from pool counts — `item_available_for_listing(item_id) > 0` — never from a stored `availability` flag. The scalar drifts on auction round-trips and partial releases; the derivation can't. CI-enforced.*

- **Unify cross-channel logic — never duplicate per channel.** If two channels need the
  same behaviour, it's **one function they both call**. Channel-specific bits live behind
  a thin adapter parameterized by a capability row — not copy-pasted `if channel == 'x'`
  branches. **Adding a channel = data + maybe one small adapter, never edits across many
  files.**

- **Channels and business rules are data, not code.** Capabilities (`is_internal_route`,
  `debits_pool`, `release_policy`, `fee_model`) live in a row. Condition/grade/channel
  codes come from lookup services — **never hardcoded string literals**.

- **Side effects fire inside the transition, not in the caller.** When a state change must
  also write an audit row, debit a counter, sync a shadow, or run first-sale-wins, those
  happen **inside the owning operation** so no caller can forget them.

- **The database is the backstop.** Invariants that matter get a CHECK, unique index, or
  FK — so they hold no matter what code runs. **App-level checks are the first line; DB
  constraints are the guarantee.**

- **One source of truth per concept.** One place for env config, one for types, one for
  design tokens. A duplicated definition is a bug that hasn't fired yet.

- **Solid ≠ over-engineered.** One file per domain is fine at v0. **The ownership boundary
  is what matters, not the abstraction layer.** Boundaries are cheap on day one and brutal
  to retrofit — which is the whole reason they're set on day one.

---

## 4. The Ownership Map — required in every repo

**Every repo's `ARCHITECTURE.md` carries an Ownership Map.** It is the single place that
answers "who writes this table?"

```markdown
## Ownership Map

| Owned state | Sole writer | Named operations |
|---|---|---|
| `Invoice.status` | `src/lib/payments/invoice-status.ts` | `markInvoicePaid`, `markInvoiceVoid` |
| `Lot` bid state | `src/lib/bidding/bid-engine.ts` | `placeBid`, `closeLot` |
```

**Rules:**

- A table with no entry is **unowned** — that's a defect, not a gap. Assign it.
- Two entries for one table is a **contradiction**. Resolve before writing any code.
- Adding a table means adding its row **in the same commit**.
- The CI guard (§8) reads this map. It isn't documentation *about* the architecture — it
  **is** the architecture, in the sense that the build fails when code disagrees with it.

---

## 5. Every mutation is named, atomic, and audited

- **Named operation, not ad-hoc field updates.** Mutations go through an explicit
  operation with declared meaning — `RECORD_SALE`, `commit_allocation`, `markInvoicePaid`,
  `REMOVE_STOCK` — not a free-form `UPDATE … SET status=…`.

- **Atomic.** Related writes happen in **one transaction under one lock**. Never split a
  counter move and its allocation update into two statements that can diverge.
  *This exact two-step pattern produced the `qty_allocated` drift in UCP.*

- **Lock the aggregate first.** Any operation on a shared aggregate takes
  `SELECT … WHERE id=$1 FOR UPDATE` as step one, so concurrent operations serialize.
  Different aggregates never block each other.

- **Audit always — no exceptions.** Every operational write emits an audit entry capturing
  actor + clearance, from→to state, deltas, reason, source. **Emit it from inside the
  central operation so it cannot be skipped.**
  *`expand_allocation` once emitted none. That's the failure mode this prevents.*

- **Idempotent at the edges.** Anything fed by a webhook or external event carries an
  idempotency key at its **single** entry point, so a duplicate delivery is a no-op.

- **Fire hooks from the owner, on the real transition.** A side effect wired at the owner
  fires exactly once regardless of path — webhook, admin action, retry, or manual.
  *Worked example: BF's reliability-score hook fires from `markInvoicePaid` on a real PAID
  transition, so every path counts exactly once.*

---

## 6. Code structure

```
routers/ | app/api/     — thin HTTP layer: auth, clearance, parse, delegate.
                          NO business logic. NO raw table writes.
services/ | lib/        — all business logic. The owning modules live here.
                          One concern per module.
workers/                — scheduled/async jobs. They CALL services.
                          They do not reimplement logic or write owned tables raw.
migrations/             — run-once, idempotent schema changes.
scripts/ci/             — guard scripts that fail the build on violations.
```

- **Routers stay thin.** Validate, check clearance, call a service. **A router containing a
  multi-step UPDATE is wrong.**
- **Workers call services.** A worker issuing a raw `UPDATE` is a bug — it bypasses the
  invariant and the audit. Route it through a named op.
- **No parallel engines.** One module per concern. Do not create a second thing that does
  what an existing owner already does.
  *An orphan duplicate counter engine (`pool_transitions.py`) caused real confusion in UCP
  and was deleted.*

---

## 7. Anti-patterns — each of these caused a real bug

| Anti-pattern | Why it's banned | Do instead |
|---|---|---|
| Raw write to an owned table outside its owner | Bypasses invariant + audit → silent drift | Call a named ledger op |
| Two-step write across related tables | Can diverge mid-way → counter drift | One atomic transition under one lock |
| Guard applied at the wrong grain (per-channel for a pool-level rule) | Created duplicate primaries across channels | Check at the correct grain |
| `if channel == 'ebay': … elif channel == 'amazon': …` | Adding a channel means editing everywhere | Capability row + adapter |
| Hardcoded literals (`'COND_NEW'`, `'pay4more'`) | Breaks when canonical data changes | Lookup service |
| A second module doing an existing owner's job | Confusion, divergence | Extend the owner |
| Mutation with no audit entry | No trail; can't reconcile | Central audit inside the operation |
| Two columns for one concept (`status` + `channel_state`) | Overlap → contradictions | One canonical field; derive the rest |
| Storing what can be derived | The stored copy drifts | Compute from authoritative state |
| Instantiating the DB client directly | Bypasses pooling/config; N connection sources | Import the single shared client |
| Authorizing on a status field alone | Status is not a permission | Check the actual authorization predicate |

---

## 8. CI guards — the architecture is enforced, not requested

**Every repo has an architecture guard wired into CI.** A rule that isn't enforced is a
rule that's already being broken somewhere you haven't looked.

**Required:**

- `npm run check:arch` / `scripts/ci/check_architecture.sh` — rejects raw writes to owned
  tables outside their owner, read from the Ownership Map (§4)
- **Allowlist baseline must be empty** (`arch-allowlist.json == []`). A non-empty
  allowlist is technical debt with a name — it goes in `PUNCH_LIST.md` with a severity.
- Branch-hygiene check — no abandoned branches (`hub/rules/02`)
- Secrets check — no `.env` on disk, no committed credentials (`hub/rules/07`)

**When you add an architectural rule, add its guard in the same task.** Otherwise you've
written a suggestion.

---

## 9. Project stages — read the registry, never infer

| Stage | You may |
|---|---|
| `PROTOTYPE` | Move fast. Shortcuts fine, no punch list needed. |
| `BUILD` | Phase 1 security. Shortcuts allowed but **must** land in `PUNCH_LIST.md`. |
| `PRODUCTION` | Phase 2 security. **No shortcuts, no skipped validations.** A corner-cut needs Samar's explicit confirmation *before* it's taken, plus a punch list entry. |
| `PARKED` | **Read-only by default.** Do not refactor, upgrade dependencies, or "improve." Ask first. |
| `ARCHIVED` | Do not modify. |

**Never infer a stage from how active a repo looks.** As of 2026-08-16 the estate has 11
projects and 3 live ones.

---

## 10. Design system — Figma is the source of truth

**Single ownership applied to design.** The same rule that governs database writes governs
design values: **one owner, everyone else reads from it.**

> **Figma owns every design token. Code consumes them. Nothing else defines them.**

### The token flow — one direction only

```
Figma (variables/styles)  →  design-tokens.json  →  CSS vars / Tailwind config  →  components
        THE OWNER              generated, committed        generated                consumes
```

- **Never hand-write a hex value, spacing number, radius, or font size in code.** If it
  isn't a token, it doesn't exist. This is the design equivalent of a raw table write.
- **Tokens are generated, not transcribed.** A human retyping a hex from Figma into CSS is
  the same failure mode as a stored value that can drift from its source.
- **A new token starts in Figma**, then flows down. Never the reverse. Code that needs a
  value Figma doesn't have is a **spec gap** — raise it, don't invent it.
- **`SPEC.md` design tokens reference the Figma file**, they don't restate its values.

### What lives in Figma

| Layer | Contains |
|---|---|
| **Foundations** | Color, type scale, spacing, radii, shadows, breakpoints, motion |
| **Components** | Every component with **all variants and states** — default, hover, focus, active, disabled, loading, error, empty |
| **Patterns** | Composed blocks: forms, tables, cards, nav, modals |
| **Pages** | Tier-1 page designs, desktop **and** mobile |

**A component that exists in code but not in Figma is undocumented design debt.** A
component in Figma but not in code is backlog. Both belong on the punch list.

### Cross-project consistency

- **One shared foundation library**, brand-themed per project. Palette and logo change per
  brand; **spacing, type scale, radii, breakpoints and component anatomy do not.**
- **Breakpoints are estate-wide constants**, not per-project decisions.
- **Mobile frames are mandatory**, not optional — mobile is the primary viewport (§10 hard
  conventions). A component designed only at desktop width is incomplete.
- **Full site redesigns are built complete in Figma before any implementation begins.** Not
  a wireframe pass — the finished thing.
- **Every new website/app and material UI redesign requires a complete linked HTML prototype
  approved by Samar before production UI implementation.** It covers every in-scope screen,
  journey, responsive viewport and material state; approval records the prototype version and
  date. Full contract: `hub/rules/10-product-experience.md`.

### Accessibility is designed in, not bolted on

Contrast is checked **in Figma, at design time**. Focus states are designed for every
interactive component, on **every surface they appear on**.

> *Bidding Fever shipped a focus ring that failed WCAG contrast and had to be fixed on
> 2026-08-16 — after launch. It failed on the navy surface, passed on white. That's a
> design-time check that got deferred to runtime.*

Full detail: `hub/rules/08-design-system.md`.

---

## 11. Hard conventions — project-wide

- **Money = integer cents + a paired `currency_code`.** Never floats. Never assume CAD.
- **`country_code`** (ISO 3166-1 alpha-2) on every operational row.
- **BIGSERIAL ids.** No UUIDs without an architecture amendment.
- **Migrations are run-once and idempotent.**
- **Audit-log entry on every operational write.**
- **No hardcoded condition/grade/channel codes** — lookup services, CI-guarded.
- **Deny-by-default authorization** on every endpoint. Response fields carry
  `min_clearance`. No financial fields below Owner clearance.
- **Type hints / strict types everywhere** — params and returns.
- **Docstrings on every public function:** what it does, **the invariant it preserves**,
  and a pointer to the spec section it implements. Explain the *why*.
- **Comment the non-obvious invariant, not the obvious line.**
  `# qty_sold is financial truth — never modified here` earns its place. `# increment
  counter` is noise.
- **No dead code**, no commented-out blocks, no TODO without a tracked task.
- **Never instantiate the DB client directly** — import the single shared instance.
- **Mobile is the primary viewport.** Every surface is responsive. Tap targets ≥44px,
  inputs ≥16px, safe areas respected.
- **Bilingual (EN/FR) where the project is bilingual** — no feature ships one-language.
- **Environment variables and secrets: use the Samar Suites secrets SOP — author every
  human-set value in the SOPS + age vault at `00-Samar-suites\secrets`, then sync it to
  the runtime platform. Platform environment panels are deployment targets, not sources
  of record.** No `.env` on disk,
  `vercel env pull` is banned. **If you need a secret, you don't have it and must not go
  looking** — name the variable and stop. *(`hub/rules/07`)*
- **Every `PRODUCTION` app/service has a dedicated Sentry project.** Source maps, release
  metadata and a verified controlled event are required before monitoring is green.
  *(`hub/rules/03`)*
- **All code is © 360ISS Inc.** Every repo carries a `LICENSE`; no other holder is named
  anywhere. *(`hub/rules/01` §9)*
- **No AI tool watermark, anywhere.** No `Co-Authored-By` bot trailer, no "Generated with"
  line, in commits, PRs, code or docs. *(`hub/rules/02`)*

---

## 12. What goes in a repo's own CLAUDE.md

> **If it is true for more than one repo, it lives here in `hub/`.**
> **If it is true for exactly one repo, it lives in that repo's `CLAUDE.md`.**
> **Nothing is written in two places.**

Repo files get **five sections, 120-line hard cap** — template at
`hub/templates/CLAUDE.md.template`:

| Section | Contains |
|---|---|
| **Header** | Version pin, stage, live URL, registry key |
| **Stack** | Versions, framework, DB, package manager — facts only |
| **Deployment fingerprint** | Platform · prod URL · database · DNS · email · payments · monitoring · CI/CD. `"none"` is valid; blank is not. |
| **Repo-specific gotchas** | Things that caused a **real bug in this repo**, each dated |
| **Where the docs live** | Pointers, never copied content |

**If you can't name the bug a gotcha prevented, it isn't a gotcha — it's a rule, and it
belongs here.**

**The test, when unsure:** *"If I fixed this in one repo, would I need to remember to fix
it in the others?"* Yes → hub. No → repo.

### Where in the hub — rules vs domains

A `yes` splits one level further. *(DECISION-012)*

| True for… | Lives in | Loaded by |
|---|---|---|
| **every repo** | `hub/rules/NN-*.md` | everyone, always |
| **repos of a certain kind** | `hub/domains/<name>.md` | only repos whose `registry.yaml` entry lists it under `domains:` |

```yaml
  - key: biddingfever
    domains: [mobile-product]        # flow style, one line — the readers are line-oriented
```

- **A domain name is a filename stem.** `domains: [mobile-product]` loads
  `hub/domains/mobile-product.md`. No mapping table, no manifest. `check-sync.py` fails on a
  name with no file; `new-project.py --domains` refuses one.
- **When unsure, it is a rule, not a domain.** A domain that every repo declares is a rule
  that was filed wrong. Domains exist for things that are *essential to some repos and dead
  weight in the rest* — not for things that are merely long.
- **A domain file links to the estate rules; it never restates them.** A restated rule drifts
  from its original, and then two documents disagree about the same thing.
- Adding a domain: write `hub/domains/<name>.md`, add the name to the entries it applies to,
  run `check-sync.py` and `build-console.py`, and record it in `CHANGELOG.md`.

---

## 13. Definition of Done

A change is **done** when all of these are true:

- [ ] It routes through the **owning module** — no raw writes to owned tables
- [ ] It is **atomic** and takes the lock first
- [ ] It **audits** from inside the operation
- [ ] It has a **docstring naming the invariant it preserves**
- [ ] It has a **test** — or a documented prod spot-check where the test env can't run it
- [ ] **CI guards pass**, including `check:arch` with an empty allowlist
- [ ] The **spec/doc is updated in the same task**
- [ ] For production: **post-deploy verification is green**, including the controlled
      Sentry event required by `hub/rules/03`
- [ ] Any shortcut taken is in `PUNCH_LIST.md` with a date, path, line, and severity

**Scope discipline:** ≤300 lines of new code per task. If it's bigger, split into numbered
sub-tasks and **finish all of them**. Never ship partial work labelled
"enhancement/deferred" without explicit approval.

**Commits stay scoped to one repo.** Work spanning two repos is two commits, two messages.

---

## 14. Anti-hallucination gates

**If a gate is hit: stop, report which gate and which document needs updating. Never
improvise.**

| # | Gate |
|---|---|
| 1 | No component or page that isn't in `SPEC.md` |
| 2 | No color or spacing value outside the design tokens in `SPEC.md` |
| 3 | No feature listed under "What NOT to Build" |
| 4 | **A complete, approved spec is required before build; any assigned qualified author or tool may write it** |
| 5 | A `SPEC.md` with no Marketing section fails |
| 6 | **No rule written in two places** (§12) |
| 7 | **No claim about infrastructure, secrets, or deployment state you haven't verified this session** |
| 8 | **No write to a table with no owner in the Ownership Map** (§4) |

---

## 15. When Samar says…

| He says | You do |
|---|---|
| *"Fix X"* | Find the root cause, fix it at the owner, add the guard so it can't recur. Not a patch at the call site. |
| *"Ready to go live"* | Trigger the Phase 2 hardening checklist before anything ships. |
| *"Harden it"* | The full rotation pass — every key, from the vault, redeploy, revoke old. |
| *"Give me the whole thing"* / *"single pass"* | Switch to consolidated output for that turn only. |
| *(default)* | **Finish the job and ship it.** Complete every authorized routine step without discretionary approval pauses, including vendor-dashboard work and requested communications. Do not ask again after Samar confirms the exact action. Mandatory platform confirmations and the gates in `hub/rules/00` still apply. Run checks, commit, push, deploy, and verify. *(Standing autonomy preference reaffirmed 2026-09-04.)* |

**Working style:** direct and technical. No preamble, no explaining basics. Show exact file
paths, not descriptions. Flag tradeoffs explicitly. Don't ask him to confirm trivial
details — make a reasonable choice and say what you picked. Surface only decisions that
genuinely need him: architecture tradeoffs, business logic, user-facing naming,
irreversible actions.

### 15.1 Answer format — short, precise, ownership-coded

*(Set 2026-08-17 by Samar.)*

> **Answer in the fewest words that are still exact.** Length is not thoroughness.

- **Lead with the answer.** The result first, the reasoning only if asked.
- **Default ceiling: 6 lines.** A table, a command, or a diff may exceed it; prose may not.
- **No recaps, no restating the question, no "great question", no closing summary.**
- **Precise beats hedged.** Give the number, the path, the flag. If it is unknown, say
  "unknown" and what would settle it — never pad with qualifiers.
- **One question at a time** when input is genuinely needed.
- Long-form is by request only: *"give me the whole thing"* / *"single pass"* (§15 table).

**Every response opens with one communication marker.** Colour *and* words, never colour alone:

| Marker | Means |
|---|---|
| 🔵 **INVESTIGATION COMPLETE** | Read-only investigation, review, analysis, or other non-deployable work is complete. Never use green when there was no deployment. |
| 🔴 **ACT: SAMAR** | Waiting only for an action legally or technically requiring Samar personally, or a genuine unresolved business decision. Criticality alone is never a reason to ask. First complete every safe preliminary step and leave only the irreducible human action. |
| 🔴 **ACT: ME** | The AI coding session still owns work. Continue; Samar is not needed. |
| 🟢 **FIXED AND READY TO TEST** | Fixed, deployed, verified available, and ready for Samar's test. Never use for local-only, unmerged, deploying, unverified, or non-deployable work. |

Never use `DONE`. Do not use `INFO` or ownerless "pending". A critical incident may append
`STOP`, but ownership stays explicit: `🔴 ACT: SAMAR — STOP` or `🔴 ACT: ME — STOP`.
Full contract: `hub/rules/00`.

For implementation, fix, deployment, and documentation work, the result itself is exactly
these four colour-coded lines, with no narrative unless Samar asks for detail:

🔵 **Decision made:** Yes | No | Unknown
🟢/🔴 **Code fixed:** Yes | No | Unknown
🟢/🔴 **Deployed to production:** Yes | No | Unknown
🟢/🔴 **Documentation updated:** Yes | No | Unknown

`Yes` requires verification in the current session. A passing build is not a deployment;
an edited source file is not documentation. Use `Unknown` when the evidence was not checked.
Use 🟢 only for a verified `Yes`; use 🔴 for `No` or `Unknown`.

**Never make Samar manually copy anything.** If he's copy-pasting, a workflow is missing.
Never make Samar find or prepare a screen the agent can open and prepare.
**Standing authority:** complete necessary in-scope critical and recovery actions without asking
for approval, including deployments, rollbacks, provider support contact, recovery messages,
secret rotation, data/schema repair, and cross-system coordination. Validate the exact target,
minimize blast radius, preserve recovery where possible, and audit the result. Stop only for a
legally/technically personal action, an unresolved business decision, unrelated scope, or when no
safe compliant path exists. Full contract: `hub/rules/00`.

**Completion truth:** Requirements mean the full authorized implementation. Report `implemented`,
`committed`, `pushed`, `deployed`, and `verified` as separate facts. A push is not a deployment.
If any required state is missing, say **not complete**, name the exact remaining work and owner,
and never use completion language or a green status to imply the work is finished.

**Feedback completeness:** Treat every correction, preference, constraint, and acceptance
criterion Samar gives during a task as an active requirement. Consolidate all feedback before
editing; verify every item before close-out. Never implement only the latest comment, make Samar
repeat prior feedback, or report a partial fix as complete. Keep communication token-efficient:
evidence and exceptions only; no repeated plans, recaps, filler, or generic theory. Full contract:
`hub/rules/00`.

**Just do it:** Stop asking Samar to do essential work or to approve it — do it. Running tests,
builds, migrations locally, fixing failures, updating docs/punch lists, committing, opening PRs and
any other in-scope step needed to finish the task is done without a prompt. Ask only for decisions
that are genuinely Samar's under the hub rules (new spend or paid services, irreversible/destructive
production actions, ambiguous product direction) — never as a checkpoint or courtesy.

**API first:** If a platform has an API, use it with credentials from the SOPS vault — never a
dashboard, browser automation, or asking Samar to click. **The vault is the encrypted
`secrets/` folder of the Samar Suites repo** (`00-Samar-suites/secrets/`, the sibling of the
`hub/` path at the top of this file; from a project repo that is e.g.
`../00-Samar-suites/secrets/` or `../../00-Samar-suites/secrets/`). "SOPS" is the encryption
tool, not a written SOP document — never ask Samar to paste a key or set a user env var.
From any repo, load keys into the current PowerShell session with
`. <path-to>/00-Samar-suites/secrets/scripts/load-env.ps1 -Only CLOUDFLARE_API_TOKEN,CLOUDFLARE_ACCOUNT_ID`
(`-File ucp` etc. for other stores; default `shared`), or pipe one value with
`sops -d --extract '["KEY"]' <path-to>/00-Samar-suites/secrets/<store>.enc.yaml`. `hub/rules/07`
is the full contract.
This covers Coolify, Cloudflare, Sentry, Google Play (Android), App Store Connect (iOS),
DigitalOcean (`doctl`), Vercel, GitHub (`gh`), Neon, Supabase and any other service with an API.
Decrypt with `sops` only into process env, never print values. If the credential is missing,
ask Samar once to create a scoped token, add it to the vault, then use the API from then on.
Browser work is the fallback only when no API exists. Don't waste tokens on screenshots or
page scraping when one API call answers the question.
Where the keys live (store = `00-Samar-suites/secrets/<store>.enc.yaml`):
`shared` — `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (DNS/cache, all zones),
`SENTRY_API_TOKEN` (read issues in every Sentry org), `VERCEL_TOKEN`, `NETLIFY_TOKEN`;
`ucp` — `COOLIFY_API_TOKEN` (`https://coolify.4more.ca/api/v1`); `4more-mobile` —
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (Play Developer API); `secrets/files/` — App Store Connect
`.p8` keys; `biddingfever-prod` — `NEON_API_KEY`, `GITHUB_PERSONAL_ACCESS_TOKEN`. Per-project
`SENTRY_AUTH_TOKEN`s are upload-only (releases/source maps) — read errors with `SENTRY_API_TOKEN`.
DigitalOcean uses the authenticated `doctl`. Windows boxes run Norton, which intercepts TLS:
use the OS trust store (Python `ssl.create_default_context()`), not certifi.

**Clean code/worktrees:** preserve unrelated WIP, isolate work in a clean worktree when needed,
remove only session-created artifacts after checking ownership, and verify formatting, tests,
`git diff --check`, `git status`, and worktree state before close-out. Never claim clean without
evidence. Full contract: `hub/rules/02`.

**Requirement-by-requirement close-out:** Every response to a change request must list every
prompt item (including attached or quoted requirements) as exactly `RESOLVED`, `NOT RESOLVED`,
or `NOT APPLICABLE`, with owner and evidence/blocker. “Fixed” or “done” alone is insufficient.

**Required close-out format:** For every change request, the final response must explicitly state
`implemented: yes/no`, `committed: yes/no` (with SHA when yes), `pushed: yes/no` (with ref when yes),
`deployed: yes/no` (with platform/deployment ID when yes), and `verified: yes/no` (with the check
or live evidence). If `deployed` or `verified` is `no`, the first marker must be 🔴 **ACT: ME**
unless the remaining action is technically or legally Samar-owned. Never say “completed”, “done”,
“ready”, or “fixed and ready to test” while any required state is `no` or unknown.

**Unattended execution:** After requirements are given, continue through the authorized scope
without repeated confirmation. Report evidence-based implementation and testing percentages,
their denominators, completed work, remaining work, owner, blocker, and deployment state. Rule
00 hard stops still apply; full contract: `hub/METHODOLOGY.md` §5.5.

---

*Built with Samar AI White Glove — idea to live in minutes, hardened at go-live,
documented to last.*

---

# Repo-specific — 360ISS Headquarters Orchestration

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
