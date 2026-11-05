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
- [ ] Reconcile this existing repository into the current estate registry; old Doppler instructions are superseded by SOPS. Severity high.
