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
