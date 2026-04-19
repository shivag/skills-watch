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

