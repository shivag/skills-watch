# Debate Log — skills-watch session 2026-04-18_mvp-shape

## Bootstrap

**Repo creation:** `~/code/greenfield/skills-watch/`, git-init'd, scaffolded with `README.md` + `.gitignore`. Session dir: `tango/2026-04-18_mvp-shape/`.

**Spikes committed before rubric draft** (7):
- `competitor_nono.md` — NoNo is the strongest substrate competitor. Strategic posture: **complement, not compete**. Use SRT as default backend, NoNo as optional.
- `substrate_srt.md` — SRT is the chosen substrate. macOS seatbelt + Linux bubblewrap + network proxy. Filesystem + network enforcement only; no syscall filtering; no Windows.
- `competitor_socket_dev.md` — Static-only, $25–50/dev/mo. Sets pricing ceiling. Adjacent not overlapping.
- `competitor_stepsecurity.md` — Harden-runner for CI is the architectural twin. **Their "Dev Machine Guard" page 404s today** — a funded competitor has identified the wedge and not shipped. Strongest "why now" signal.
- `competitor_skills_sh_audits.md` — Static aggregation of Socket/Snyk/Gen Agent verdicts. Validates category, leaves runtime tier wide open. Possible distribution partner.
- `icp.md` — Solo devs using Claude Code / Cursor / Codex who install community skills. Pain: zero visibility + no kill-switch + existing tools require policy authoring.
- `niche_expansion.md` — Three expansion directions (cross-harness → team policy → CI). Three kill-cases (Anthropic bakes it in; NoNo ships registry; fear doesn't materialize).

---

## Round R0 — Rubric Draft

**Driver (v1):** Initial rubric with 4-tag constraint vocabulary (mkt/dep/biz/inherent), three sub-rubrics (Product/Technical/Business), mandatory painkiller + friction + time-to-user items per the tango-product SKILL.md contract.

**Critic (Gemini 2.5 Pro, Round 1)** — `gemini_round1_raw.md`.

Key catches integrated into v2:
- Killed yellow/unusual color state as a vitamin.
- Killed dynamic SKILL.md-parsed network allow-list for v0 (complexity bomb); replaced with deny-by-default + hardcoded core-API allow-list.
- Caught env-var contradiction: Product rubric tested reading `ANTHROPIC_API_KEY`, Technical rubric strips it. Resolved by testing that scrubbing worked (read yields empty) rather than testing the sandbox blocks access to a non-existent var.
- Moved C4.1 (observability-first) + C4.2 (zero-config) from immutable constraints → Product-rubric guiding principles. Honest: these are strong principles, not laws of physics.
- Upgraded "≥ 20 install events" vanity metric → "≥ 10 users who successfully execute a skill run" (full loop signal).
- Added CLI exit-code semantics (scriptability).
- Added explicit npx distribution constraint.
- Softened C2.2 from "if skills.sh disappears, wedge disappears" to "v0 focuses on skills.sh but not limited to it" — aligns with niche_expansion.md's cross-harness expansion plan.
- Specified log format: `[ACTION] [OBJECT]` (kills "human-readable" ambiguity).
- Clarified blocked-action behavior: skill process is terminated immediately.

Verdict: **ACCEPT v2** — integrated wholesale.

**Critic (Gemini 2.5 Pro, Round 2)** — `gemini_round2_raw.md`.

Round 2 instructed not to repeat Round 1. Found 5 genuinely-new surgical attacks:

1. **Latency split.** 500ms cold-start doesn't cover the npx download on first run. Fix: LATENCY-PRIME (≤ 10s clean laptop, 50 Mbps) + LATENCY-WARM (≤ 1s cached). **Integrated.**
2. **PII-grade red-team.** Current list caught catastrophic exfil (`~/.ssh`) and obvious modification (`~/.zshrc`) but missed shell-history secrets. Fix: add `~/.zsh_history` / `~/.bash_history` to deny-list + as red-team attack #5. **Integrated.**
3. **stdin handling.** v2 was silent. Passing through = injection vector; blocking silently = interactive skills hang. Fix: explicit UX-INTERACTIVE rule — EOF default + one-time notice. **Integrated.**
4. **Path forward on BLOCKED.** Hard "no" creates a wall when a skill legitimately needs a denied path. Fix: actionable BLOCKED message format with docs link. Turns "no" into "not yet," collects v1 feature demand. **Integrated.**
5. **Business-metric gaming.** "Successfully executing a skill run" could count blocked runs as wins. Fix: tighten to "completes without any BLOCKED actions." **Integrated.**

Verdict: **ACCEPT all 5 surgical patches.** No structural rewrite needed.

---

## Rubric v4 (user amendment, 2026-04-18)

User instructed: flip `~/.gitconfig` to deny by default; handle git as a dedicated policy bucket; add explicit escape hatch.

Changes:
- Added `~/.gitconfig`, `~/.git-credentials`, `~/.config/git/credentials` to filesystem deny-list.
- Added red-team attacks #6 (read `~/.gitconfig`) and #7 (read `~/.git-credentials`).
- New Technical item **[GIT POLICY]** — cleanly splits local repo access (allowed) from global identity/credentials (denied) with explicit network fallback for `git push`/`clone`.
- New Technical item **[ESCAPE HATCH]** — `--allow <path>` + `--allow-host <domain>` CLI flags, per-run only, no persisted config.
- Updated `[CLARITY actionable BLOCKED]` format: the BLOCKED line now suggests the exact `--allow` flag to retry with, so users recover in one keystroke without reading docs.

Committed as `tango: rubric v4 - gitconfig deny, GIT POLICY split, --allow escape hatch`.

---

## Phase 1

### Round 1 — `# Product` section

**Driver (patch_r1_product.md):** Populate `# Product` section with concrete target user, one-command UX flow, explicit default deny-list and BLOCKED behavior, escape-hatch demonstration, and explicit out-of-scope list.

**Rubric items addressed:** all 6 Product items + C1.1, C1.2, C4 guiding principles, plus supporting Technical (exit code, latency, git policy, escape hatch) in narrative form.

**Critic (Gemini 2.5 Pro):** `gemini_r1_product_raw.md`.

**Verdict: ACCEPT.** Every constraint and every rubric item PASS. Zero ungrounded claims, zero cross-section contradictions, zero scope creep, zero undefended tech choices, zero vitamins, zero friction added, no simpler alternative, no time-to-user risk.

**Rubric evolution proposal** (Level 2, deferred until v0 ships):
- Product L2: interactive-override prompt on BLOCKED; themed `--allow-profile=git-publish`; team policy via `--policy <url>`.
- Technical L2: Windows substrate; NoNo as alternate backend via `--backend=nono`.
- Business L2: first paying team on ≤$10/dev/mo plan; skills.sh "Guarded by" co-brand.

Not integrated — these are Level 2 evolution triggers to revisit after the three Level 1 rubrics PASS end-to-end.

**Action:**
- Applied patch to `arena.md` `# Product` section.
- ELI12 rewritten (v1) to reflect concrete UX — command, latency, deny-list specifics, BLOCKED format, local `.git/` stays usable.
- ELI12 Changelog row v1 added.

### Round 2 — `# Technical` section

**Driver (patch_r2_technical.md):** Populate `# Technical` section with 5-module component breakdown (`bin/skills-watch` + `policy.ts` + `runner.ts` + `formatter.ts` + `summary.ts`, ~500 LOC total), universal policy shape (filesystem / network / env-var / process deny-lists), end-to-end execution flow, verification spike list, and explicit SRT-inherited limits.

**Key defenses in the patch:**
- **Language choice:** TypeScript (not Python or shell) — simpler-more-powerful because SRT is TS so library import is zero-IPC; users who already have Node for `npx` need no additional runtime.
- **SRT-bounded design:** no features assume SRT provides syscall filtering or process-deny primitives it doesn't.
- **Env-var scrubbing is a gap SRT doesn't close** — patch correctly specifies skills-watch does this *before* sandbox entry.
- **500 LOC / 14-day ship is realistic** — every module under 120 LOC.

**Critic (Gemini 2.5 Pro):** `gemini_r2_technical_raw.md`.

**Verdict: ACCEPT** with one clarification: the process deny-list (blocking `exec` of `pip`, `npm`, `curl`, etc.) is implemented via SRT's `filesystem.denyRead` on the absolute binary paths (since SRT v1 doesn't expose a dedicated `process.denyExec` primitive). Clarification integrated.

**Every rubric item (Product / Technical / Business) PASSES.** Zero ungrounded claims, zero contradictions, zero scope creep, zero vitamins, zero friction added, no simpler alternative, low time-to-user risk.

**Rubric evolution proposal** (Level 2, deferred):
- Technical L2: lobby SRT for first-class `process.denyExec` primitive; `--backend=nono` abstraction for Landlock-grade isolation.
- Business L2: opt-in telemetry on which `--allow` / `--allow-host` flags are used most often — drives v1 auto-allow-list feature prioritization.

**Action:**
- Applied patch to `arena.md` `# Technical` section, with process-deny clarification inline.
- ELI12 unchanged at user level (Technical internals don't belong in ELI12 by design) — changelog row v2 documents this explicitly.

---

## Phase 1 Status

Both main arena sections populated and ACCEPTED by Gemini:
- `# Product` — 6/6 Product items covered in narrative, rubric-traced.
- `# Technical` — 9/9 Technical items architecturally supported; quantitative items (LATENCY-PRIME/WARM, red-team block %) deferred to implementation-phase spikes.

Business rubric items (14-day ship, ≥10 unique user runs, $10/dev/mo team-tier anchor) are build-and-ship-phase verification — not satisfiable from the debate surface alone.

**Next natural checkpoint:** user decides between
- (a) Run Round 3 + constraint audit to further tighten Level 1, or
- (b) Converge to Phase 2: hoist `arena.md` into `README.md` / `PRD.md` / `TECH_PLAN.md` and start shipping.

---

## Round 3 — Constraint Audit (triggered by user request)

**Trigger:** user question — "When I type `/tango-research` inside Claude Code, can `skills-watch` guard it? How would `/skills-watch /tango-research` work?" — exposed that skills aren't standalone processes; they're instructions an agent follows via its own tool loop. The CLI wrapper design misses the real integration point.

**Critic (Gemini 2.5 Pro):** `constraint_audit_r3.md`.

**Audit results:**
- **C1.1, C1.2, C2.1, C3.1:** SLACK. No relaxation needed.
- **C2.2 (dep: skills.sh focus):** 🚨 **BINDING.** Original text targeted the `skills.sh` *install flow*; real value lives in the *agent tool loop*. Current CLI wrapper cannot intercept tool calls. [FRICTION] rubric item flips from PASS (CLI context) to FAIL (agent context).
- **C3.2 (biz: time-to-ship):** NEAR. 500 LOC CLI is 14-day-achievable but it's the wrong 500 LOC. Hook architecture is ~150-200 LOC and ships faster.

**🚨 Verdict flip:** Relaxing C2.2 to "Claude Code agent tool loop" flips [FRICTION] from FAIL → PASS. User-experience-defining.

**Recommendation:** **Claude Code hook** over policy pack or CLI.
- CLI: misses the pain entirely.
- Policy pack (~50 LOC): ships fast but loses the live-observability PAINKILLER — only enforces, doesn't show.
- **Hook (~150-200 LOC):** satisfies both PAINKILLER items (enforce via SRT + stream live report), realizes FRICTION (one-time install guards every skill forever), de-risks TIME-TO-USER (half the code of the original plan).

**Proposed revisions:**
- `C2.2`: from "skills.sh install flow" → "Claude Code agent tool loop" (primary), cross-harness expansion as future.
- `[FRICTION]`: from "one command `npx skills-watch <skill>`" → "one command `npx skills-watch-install`, then every `/skill` guarded".
- `[PAINKILLER-1 live stream]`: live events streamed to `~/.skills-watch/live.log` (tailable) since hooks can't reliably print to the primary TTY. Open question for Round 4: does Claude Code's hook stderr surface inline to the user? If so, prefer inline; fallback log file only if not.

**Migration impact on arena.md:**
- `# Product`: rewrite the "one-command experience" around install-once-then-automatic.
- `# Technical`: replace 5-module CLI architecture with 2-module installer-plus-hook architecture (`bin/skills-watch-install` + `bin/skills-watch-hook`).

**Status: STOPPED per SKILL.md protocol. Awaiting user decision on pivot.**

## Pivot approved 2026-04-18
User: "yes" — execute the pivot with "make it easy and automatic for the user if possible."

Actions taken:
- Verified Claude Code hook API via claude-code-guide agent: exit 0 (allow), exit 2 (block with stderr fed to Claude), hooks can't stream mid-tool, no SessionEnd event. Live-log-tail pattern confirmed as the correct observability approach.
- Rewrote `rubric.md`: flipped C2.1 (dep: SRT → dep: Claude Code hook API); flipped C2.2 (skills.sh install flow → Claude Code agent tool loop); rewrote all Product + Technical items around the hook architecture; deprecated pre-pivot items into Defeated Rubrics with explicit R3-pivot tags.
- Rewrote `arena.md`: new ELI12 around "install-once, then every skill guarded"; Product section around `npx skills-watch install` one-command UX; Technical section around 2 components (installer CLI + hook) totalling ~200 LOC.

### Round 4 — combined critique of post-pivot rewrite (`gemini_r4_pivot_raw.md`)

**Verdict: REJECT.** Three surgical failures found:
1. **Env-var scrubbing is impossible in the hook model.** Hooks see tool-call payloads, not the subprocess environment. "Scrub" language was a ghost feature carried over from the SRT design.
2. **`SessionEnd` hook doesn't exist.** The [CLARITY — session summary] item as written was unimplementable.
3. **Env-var-based escape hatch was unverified.** The assumption that `SKILLS_WATCH_ALLOW=... claude-code` propagates to the hook subprocess was never proven and may not hold.

Suggestions: spike env-var propagation; replace SessionEnd with a `summary` CLI that post-processes the log; replace env-var escape hatch with a config-file + CLI-managed allow-list.

**Fixes applied:**
- Env-var scrub → [PAINKILLER — env-var read detection]: hook pattern-matches `printenv $SECRET` etc. in Bash command strings. Honest limit named: base64-encoded variants slip through, v1 adds SRT subprocess wrapping as a second layer.
- SessionEnd SUMMARY → `npx skills-watch summary [--since <duration>]` CLI subcommand that post-processes `~/.skills-watch/live.log`.
- Env-var escape hatch → persistent `~/.skills-watch/config.json` + `npx skills-watch allow {add|add-host|remove|remove-host|list}` subcommands. Installer CLI ships with these. Config file is the single source of truth.

### Round 4b — re-critique (`gemini_r4b_pivot_raw.md`)

**Verdict: REJECT.** Narrow but fatal: three stale references to the old escape-hatch mechanism survived the fixes — one in Product-section text (`set env: SKILLS_WATCH_ALLOW=...`), one in the Technical-section flow example, one in the Product rubric's [CLARITY — actionable BLOCKED] item (`rerun with: --allow <path>`). The technical design was sound but the user-facing spec told a contradictory story.

**Fixes applied:** normalized all three references to the `npx skills-watch allow {add|add-host} <arg>` syntax.

### Round 4c — re-critique (`gemini_r4c_pivot_raw.md`)

**Verdict: ACCEPT.** Every constraint + every Product / Technical / Business rubric item PASS. Zero ungrounded claims, zero contradictions, zero scope creep. Security claims honestly bounded ("pattern-matching is defeatable, v0 accepts the trade"). Escape hatch preemptively de-risked. 14-day time-to-user credible at ~200 LOC.

**Rubric evolution proposed (Level 2, deferred):**
- Technical: SRT subprocess wrapping as a second enforcement layer; Cursor / Codex / Cline / Gemini CLI integrations.
- Product: per-skill trust profiles; team shared allow-lists.
- Business: opt-in telemetry on `allow add` to drive v1 auto-profile prioritization.

All deferred — Level 1 is ready to ship.

---

## Phase 1 complete. Proceeding to Phase 2 convergence.

---

## Phase 2 — Converge

### Final Summary

**Rounds run:** 2 rubric rounds (Gemini R1 + R2), 1 user rubric amendment (R4 gitconfig + git-policy split + escape hatch), 2 Phase-1 arena rounds (Product + Technical, both ACCEPT), 1 constraint audit (R3, 🚨 flip on C2.2), 1 post-pivot triple (R4 REJECT → R4b REJECT → R4c ACCEPT after three surgical fixes).

**Gemini transcripts:** `gemini_round1_raw.md`, `gemini_round2_raw.md`, `gemini_r1_product_raw.md`, `gemini_r2_technical_raw.md`, `constraint_audit_r3.md`, `gemini_r4_pivot_raw.md`, `gemini_r4b_pivot_raw.md`, `gemini_r4c_pivot_raw.md`.

**Levels achieved:** Level 1 complete across all three sub-rubrics (Product / Technical / Business). Level 2 items proposed by Gemini across multiple rounds but deferred per SKILL.md — evolve only when Level 1 genuinely ships.

**Key decisions:**
- **Constraint pivot (R3):** C2.2 moved from "skills.sh install flow" to "Claude Code agent tool loop." The CLI-wrapper architecture killed; hook architecture adopted. This was the largest single decision and the one the entire rest of the design hinges on.
- **Enforcement primitive:** pattern-matching at the hook-API boundary (not kernel-enforced). Honest limit named in TECH_PLAN; v1 path to SRT subprocess wrapping preserved.
- **Escape hatch:** persistent `~/.skills-watch/config.json` managed by `npx skills-watch allow {add|remove|list}`. Env-var-based override explicitly rejected as unverifiable through Claude Code's subprocess boundary.
- **Observability:** log-file tail (`~/.skills-watch/live.log`) + on-demand `npx skills-watch summary`. Inline streaming infeasible because hooks can't write to the user's TTY.
- **Scope:** ~200 LOC total, 14 calendar days to v0 in a real outside developer's hands.

**Spikes committed:** 7 in Phase 0 (5 competitor/substrate teardowns + ICP + niche expansion). 5 additional verification spikes enumerated in TECH_PLAN and required before v0 ship; these will be committed during implementation, not debate.

**Deliverables hoisted at Phase 2:**
- `README.md` (repo root) — ELI12 pitch, install instructions, blocking story, honest limits.
- `PRD.md` (repo root) — Product section with rubric-trace table at top, spike evidence at bottom.
- `TECH_PLAN.md` (repo root) — Technical section with rubric-trace + dependency floors + verification spikes required for ship.

**Debate archive preserved:** `tango/2026-04-18_mvp-shape/arena.md`, `rubric.md`, this `debate_log.md`, all raw Gemini transcripts, all spikes, both patch proposals (`patch_r1_product.md`, `patch_r2_technical.md`), and `constraint_audit_r3.md`.

**Next action (outside the Tango session):** start implementation. Write the 5 verification spikes, stand up the `skills-watch` npm package, ship v0 to one outside developer within 14 days. If any verification spike FAILs, re-enter Tango (new session, inherit defeated rubrics) before shipping.

**Session closed 2026-04-18.**

