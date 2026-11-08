# samar-minime-systems — Punch List

Pre-go-live shortcuts to clean up. Items are added automatically as Phase 1 corners are cut.

**Format:** `- [ ] **[YYYY-MM-DD]** Description. File: \`path/to/file.ts:line\`. Severity: low/med/high.`

**Severity guide:**
- **high** — Security risk, data integrity, payment correctness. Must fix before go-live.
- **med** — Technical debt that will cause problems at scale or confuse future contributors.
- **low** — Code smell, naming, style. Fix when convenient.

---

## Items

<!-- Items are added here as shortcuts are taken during development -->

### Auto-scanned items

- [ ] **[scan]** `platform/agent-core/src/built-in-agents.ts:52:    systemPrompt: `You are the Implementation Builder for Samar-Minime Sys...` Severity: low.

## Headquarters recovery (2026-11-05)
- [ ] Confirm restored Prisma client schema against staging; preserve legacy data. Severity high.
- [ ] Bridge HQ integer-cent reservations and exact tenant/agent/policy versions into dispatch/settlement before enabling execution. Severity high.
- [ ] Verify real provider prices, token limits, timeout cancellation and ambiguous billing recovery. Severity high.
- [ ] Validate Temporal replay and independent QA in a real isolated worker environment. Severity high.
- [x] Registered as `headquarters-orchestration` in Samar Suites and replaced the retired
  methodology/Doppler instructions with the v9.1.0 hub contract. Evidence: Samar Suites
  `hub/registry.yaml` and this repo's generated agent files. Severity high.
- [ ] Repository is publicly visible contrary to the private-repository standard. Assess
  dependent access before changing visibility. File: `CLAUDE.md`. Severity: high.
- [ ] Add the estate readiness adapter, architecture ownership guard, `CONTRIBUTING.md`,
  and required development/release workflow projections before enabling a worker. File:
  `.github/workflows/ci.yml`. Severity: high.

- [ ] Connect the disabled API to the authoritative HQ session/project/ledger owner before exposing business routes; no bearer-header presence check may substitute for verification. Severity high.
- [ ] Replace the legacy dashboard/auth scaffold with approved Headquarters UI and secure session integration; compile success is not UI acceptance. Severity high.

- [ ] Implement scoped notification outbox delivery and separate read acknowledgements; legacy dispatch/store now explicitly unavailable and cannot report fabricated success. Severity high.
