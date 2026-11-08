<!-- GENERATED — DO NOT EDIT. Source: ../../../00-Samar-suites/hub/CLAUDE.md · Regenerate: ../../../00-Samar-suites/hub/agents/generate.py -->

# 360ISS Headquarters Orchestration — Copilot Instructions

Stage: **BUILD** · Methodology: Samar AI White Glove v9.1.0
Full rules: `CLAUDE.md` in this repo. This file is the condensed set.

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

## Domains

This repo declares **no domains** in `hub/registry.yaml`, so no `hub/domains/` file applies. `hub/rules/` applies in full, as everywhere.

## Non-negotiable

1. **One concern, one owner.** Everything else calls the owner.
2. **Single writer per table.** Never write to an owned table outside its owning module —
   CI rejects it (`npm run check:arch`). Check the Ownership Map in `ARCHITECTURE.md`
   before any write.
3. **Every mutation is named, atomic, and audited.** Named operation, one transaction, lock
   the aggregate first, audit from inside the operation.
4. **Money is integer cents + `currency_code`.** Never floats. Never assume CAD.
5. **Design values come from tokens only.** Never hand-write a hex, spacing value, radius or
   breakpoint — Figma owns them.
6. **Prototype before implementation.** Every new website/app and material UI redesign needs
   a complete linked HTML prototype approved by Samar before production UI implementation.
7. **Never read or write secrets.** No `.env` files. If you need a secret, name the variable
   and stop.
8. **Derive, don't store,** anything that can drift.
9. **Reverse-engineer before trusting a doc.** Code is what's running.
10. **Original estate work is proprietary to 360ISS Inc.** Preserve the repo `LICENSE`,
   third-party notices and provenance. No AI attribution, branding, credits or co-author
   metadata may appear in project artifacts or commits.

## Communication with Samar

Every response starts with one exact marker: `🔵 INVESTIGATION COMPLETE` for completed
non-deployable work; `🔴 ACT: SAMAR` for Samar's one manual action or material approval;
`🔴 ACT: ME` while the coding session still owns work; `🟢 FIXED AND READY TO TEST` only
when the fix is deployed, verified available, and ready for Samar's test. Never use green
when there was no deployment. Never use `DONE`, `INFO`, or ownerless `pending`.

For implementation, fix, deployment, and documentation work, respond with exactly these
four colour-coded lines and no narrative unless asked:

🔵 **Decision made:** Yes | No | Unknown
🟢/🔴 **Code fixed:** Yes | No | Unknown
🟢/🔴 **Deployed to production:** Yes | No | Unknown
🟢/🔴 **Documentation updated:** Yes | No | Unknown

`Yes` requires verification in the current session. A passing build is not a deployment;
an edited source file is not documentation. Use `Unknown` when evidence was not checked.
Use 🟢 only for a verified `Yes`; use 🔴 for `No` or `Unknown`.

## Never do

- Raw write to an owned table outside its owner
- Two-step write across related tables (use one atomic transaction)
- `if channel == 'x': … elif channel == 'y':` — use a capability row + adapter
- Hardcoded condition/grade/channel literals — use the lookup service
- A second module doing an existing owner's job
- A mutation with no audit entry
- Two columns for one concept
- Instantiate the DB client directly — import the shared instance
- Authorize on a status field alone
- Ship a feature without its mobile viewport

## Done means

Routes through the owner · atomic + locked · audits · docstring names the invariant ·
has a test · CI guards pass with an empty allowlist · docs updated in the same change ·
shortcuts logged in `PUNCH_LIST.md` with a date and severity.

## Repo specifics

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
