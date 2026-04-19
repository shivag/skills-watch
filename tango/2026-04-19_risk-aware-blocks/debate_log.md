# Debate Log — skills-watch v0.2 risk-aware blocks, session 2026-04-19

## Bootstrap

Continuation of skills-watch product. Prior session (`2026-04-18_mvp-shape`) converged to v0 PRD/TECH_PLAN; v0.1.0 implementation shipped. This session proposes v0.2 feature patch.

**Prior defeated rubrics inherited** (see rubric.md bottom).

**Phase 0 spikes committed** (2):
- `ingress_egress_evidence.md` — Snyk ToxicSkills data (91% of malicious chains combine prompt-injection-on-ingress with egress tool calls; 36% prompt-injection rate). Validates that the rebalance is defensible because downstream egress still catches the chain end.
- `risk_taxonomy.md` — OWASP LLM Top 10 2025 + MITRE ATLAS v5.1.0 prior art. Decision: plain-English labels in primary UI (harden-runner precedent), OWASP + ATLAS codes in log JSON only.

## Round R1 — Gemini R1 REJECT (`gemini_r1_raw.md`)

Key criticisms:
1. **C5.1 "no regression" contradicted the rebalance premise** — a v0.1 `Bash curl` that was blocked is now intentionally allowed. Phrasing needed correction.
2. **`PROMPT-INJECT` was vaporware** — labeled stretch-goal in the spike, included in the rubric's 9-category taxonomy. Intellectually dishonest.
3. **`[SUMMARY-AWARE]` was a vitamin** — `grep` covers it.
4. **9-category taxonomy was too granular for v0.2 scope + 7-day timeline** — Gemini suggested collapsing to 5-6.
5. **`[PAINKILLER — risk-literate BLOCKED]` "one-sentence why"** was a creative writing prompt, not a binary-verifiable spec. Needed: committed copy file.
6. **`[NO-REGRESSION-DOGFOOD]` "3 sessions"** was gameable — a "session" undefined.
7. **7-day timeline was unrealistic for 9-category scope** — with cuts, plausible.

## Round R1 → R2 integration

All 7 criticisms integrated:
- C5.1 rephrased to "no malicious-outcome regression."
- `PROMPT-INJECT` cut; moved to v0.3 backlog in defeated-rubrics section.
- `[SUMMARY-AWARE]` cut.
- Taxonomy collapsed 9 → 5: `SENSITIVE-DATA-READ`, `PERSISTENCE-ATTEMPT`, `UNAUTHORIZED-EGRESS`, `SUPPLY-CHAIN`, `INGRESS-EXEC`.
- Copy spec moved to "committed `src/risk-copy.json` with golden-file tests" — fully verifiable.
- Dogfood metric sharpened: "3 sessions of ≥15min with ≥5 WebFetch calls each, zero false BLOCKs."
- Timeline held at 7 days (scope cut makes it plausible per Gemini's own admission).

## Round R2 — Gemini R2 ACCEPT (`gemini_r2_raw.md`)

> "This is an exemplary revision. It honestly and surgically addresses every major criticism from Round 1, resulting in a spec that is smaller, more verifiable, and internally consistent."

All 4 R1 criticism categories PASS. Deep-dive checks all green:
- `risk-copy.json` spec watertight via golden-file tests.
- 5-category collapse preserves user-facing risk literacy; finer splits are v0.3.
- 8-scenario Bash-curl spec sufficient for v0.2 baseline (exhaustive coverage v0.3).
- WebFetch rebalance honestly framed: content itself isn't the harm; downstream actions are still policed.
- No new cross-section contradictions.

**Rubric evolution proposed (Level 2 / v0.3):**
1. More sophisticated Bash pattern detection (obfuscated: `cmd="sh"; curl | $cmd`, sudo, base64 decode + pipe).
2. User-feedback-driven category splits (if the 5-category UI proves too coarse in practice).
3. Configurable per-host egress rules (allow POSTs to specific hosts users have whitelisted).

**Deferred to v0.3.** v0.2 ships the rebalance + 5-category taxonomy only.

## Phase 0 Status: AWAITING USER APPROVAL

Before Phase 1 (arena-section population rounds) begins, user must approve the v0.2 rubric.
