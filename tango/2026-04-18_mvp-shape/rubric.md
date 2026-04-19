# 🔒 Immutable Constraints
*Binary rules. Any proposal violating these is instantly rejected. Every sub-item carries a floor tag.*

- **C1.1 (mkt: skills.sh community)** The v0 buyer is a solo developer or small dev-tools team who installs community skills. Not a CISO. Any proposal requiring an enterprise security motion (SOC2, SIEM) is a different product. — *Justification: spikes/icp.md defines the wedge; StepSecurity serves the CISO buyer.*
- **C1.2 (mkt: builder not security-engineer)** The product must provide immediate value with **zero** manual policy authoring. A user must never be forced to write an allow-list to get their first security report. — *Justification: NoNo owns the policy-authoring market; our wedge is zero-config (spikes/competitor_nono.md).*
- **C2.1 (dep: Claude Code hook API)** Enforcement is bounded to what Claude Code's hook API exposes: `PreToolUse` sees the requested tool + arguments as a JSON payload; the hook exits 0 (allow), 2 (block, feed stderr to Claude), or other (non-blocking warn). Hooks cannot observe subprocess syscalls or mid-tool activity. Decision is pattern-based on the tool-call payload, not kernel-enforced. v0 accepts this trade: breadth-of-coverage (every tool call) beats depth-of-enforcement (subprocess sandboxing). — *Justification: Claude Code hooks docs (verified Round 3 audit); depth via SRT subprocess wrapping is a v1 layer.*
- **C2.2 (dep: Claude Code agent tool loop)** v0 is built and marketed for **Claude Code's tool loop** — skills-watch installs as a Claude Code hook (`~/.claude/settings.json`) and guards every tool call the agent makes on the user's behalf. Cursor, Gemini CLI, Codex integrations are explicit v1+ expansion paths, not v0 goals. The skills.sh community is the ICP for distribution (skills-watch is itself installable via `npx skills add`), but the enforcement integration point is Claude Code's tool loop. — *Justification: Round 3 constraint audit (`constraint_audit_r3.md`) — the real pain lives inside the agent's tool loop, not the skills.sh install flow.*
- **C3.1 (biz: v0 GTM)** v0 is free for solo use. Any eventual team tier is priced ≤ $10 / developer / month. The v0 feature set will not be moved behind a paywall. — *Justification: Brackets price below Socket ($25) and StepSecurity ($16) comps.*
- **C3.2 (biz: time-to-ship)** v0 must be in a real external user's hands in ≤ 14 calendar days from rubric approval. — *Justification: Mitigates kill-cases A (Anthropic bakes it into Claude Code) and B (NoNo ships skill registry) from spikes/niche_expansion.md.*

---

# 🎯 Product Rubric (Level 1)
*Guiding principles: (1) Observability is the product; enforcement is a safety net.
(2) First run is zero-config.*

- [ ] **[PAINKILLER — live log]** After one-time install, every tool call Claude Code makes while running any skill is logged to `~/.skills-watch/live.log` in real time, one line per call, formatted as `[ACTION] [OBJECT]` (e.g. `READ /home/user/.gitconfig`, `CONNECT github.com:443`, `EXEC /usr/bin/python3`). Users who want live observability run `tail -f ~/.skills-watch/live.log` in a second terminal; users who don't, don't. *Verifiable by invoking a skill and diffing the log against an expected event list.*
- [ ] **[PAINKILLER — block-on-use]** When a skill (via Claude Code's tool loop) attempts any of these actions, the hook returns exit code 2, Claude Code blocks the tool call, and the stderr message (surfaced to the user via Claude's response) reads `BLOCKED: [ACTION] [OBJECT] — to allow, run: npx skills-watch allow add <path>`: (1) read `~/.ssh/id_rsa`, (2) connect to a non-allowlisted host (e.g. `example.com`), (3) `pip install <pkg>`, (4) write to `~/.zshrc`, (5) read `~/.zsh_history` / `~/.bash_history`, (6) read `~/.gitconfig`, (7) read `~/.git-credentials`. *Verifiable by spike: each attack runs inside a Claude Code session with the hook installed; observe exit-2 response and Claude's user-facing BLOCKED message.*
- [ ] **[PAINKILLER — env-var read detection]** When a `Bash` tool call invokes `printenv <SECRET>`, `echo $<SECRET>`, or `env | grep <SECRET>` for any variable matching the patterns `AWS_*`, `ANTHROPIC_*`, `OPENAI_*`, `GEMINI_*`, `GOOGLE_*`, `GITHUB_TOKEN`, `NPM_TOKEN`, `SSH_*`, the hook blocks with exit 2. *Verifiable by red-team spike.* — *Note: the hook cannot actually scrub the environment (that requires SRT subprocess wrapping, deferred to v1). v0 detects and blocks READ ATTEMPTS via command-string pattern matching, which catches the common attack pattern even if it doesn't prevent a base64-encoded variant.*
- [ ] **[FRICTION]** From "I have Claude Code installed" to "my next `/skill` command is guarded" is **one command** (`npx skills-watch install`) and **zero prompts**. After that, every subsequent skill invocation inside Claude Code is guarded automatically — nothing to prepend, nothing to configure. No login, no account, no API key. *Verifiable by new-user walkthrough: run the install, invoke a red-team skill in Claude Code, observe block.*
- [ ] **[CLARITY — summary CLI]** `npx skills-watch summary` post-processes `~/.skills-watch/live.log` and prints the session-most-recent summary: `SUMMARY: N tool calls, K BLOCKED (since <iso8601>)`. Accepts `--since <duration>` (e.g. `--since 1h`) to window the summary. *Verifiable by spike: run a known sequence of tool calls, then `skills-watch summary --since 10m` returns the expected counts.* — *Replaces the impossible `SessionEnd` hook approach flagged in R4; Claude Code's hook API has PreToolUse / PostToolUse / UserPromptSubmit / SessionStart but no SessionEnd.*
- [ ] **[CLARITY — log format]** Each line in `~/.skills-watch/live.log` has format `<iso8601> <VERB> <OBJECT>` for allowed actions and `<iso8601> BLOCKED <VERB> <OBJECT>` for denied. Users can `grep BLOCKED` to audit or `tail -f` to observe live. *Verifiable by format spec.*
- [ ] **[CLARITY — actionable BLOCKED]** Every stderr message the hook emits on block states exactly what was blocked AND the exact one-line CLI command to permanently allow it. Format: `BLOCKED: [ACTION] [OBJECT] — to allow, run: npx skills-watch allow {add <path> | add-host <domain>}`. Because the hook's stderr is surfaced via Claude's response (not raw), Claude will naturally relay both the block and the override command to the user. *Verifiable by red-team spike: observe Claude's user-visible response contains the `npx skills-watch allow add …` command verbatim.*
- [ ] **[UX-INSTALL]** `npx skills-watch install` is idempotent: running it twice is a no-op on the second run, and it never silently overwrites an existing `hooks` block in `~/.claude/settings.json`. If the user already has competing hooks, the installer asks once for confirmation, then merges. *Verifiable by spike: install twice → second run outputs `already installed`.*

# 🎯 Technical Rubric (Level 1)
*Engineering binary pass/fail. What must be true for the system to actually work?*

- [ ] **[HOOK-INSTALL]** `npx skills-watch install` writes a `PreToolUse` hook entry to `~/.claude/settings.json` that invokes `skills-watch-hook` on every `Bash`, `Read`, `Write`, `Edit`, `WebFetch`, `WebSearch` tool call. Install is idempotent and preserves any pre-existing hooks. *Verifiable by diff of `~/.claude/settings.json` before and after a double-install.*
- [ ] **[HOOK-DECISION]** The hook parses the tool-call JSON payload (tool name + args), applies the universal deny-list as pattern checks, and returns exit 0 (allow) or exit 2 with stderr (block). *Verifiable by unit test: given a payload JSON, assert expected exit code + stderr.*
- [ ] **[FILE DENY]** The hook denies any `Read` / `Write` / `Edit` tool call targeting: `~/.ssh/`, `~/.aws/`, `~/.gnupg/`, `~/.netrc`, `~/.docker/config.json`, `~/.agents/.env`, `~/.zsh_history`, `~/.bash_history`, `~/.gitconfig`, `~/.git-credentials`, `~/.config/git/credentials`, or any `.env` outside the current working directory. *Verifiable by spike: 11 red-team `Read` calls, all get exit 2.*
- [ ] **[GIT POLICY]** Git access is split cleanly:
  - **Allow:** `Read` / `Write` on `<cwd>/.git/` (legit skill commits into the current repo).
  - **Deny:** all reads of `~/.gitconfig`, `~/.git-credentials`, `~/.config/git/credentials`.
  - **Bash git commands:** `git push` / `git clone` / `git fetch` etc. only blocked if the remote resolves to a non-allowlisted host (`github.com` included by default).
  *Verifiable by red-team spike: skill can `git add/commit` in cwd but CANNOT read user's global identity.*
- [ ] **[NET DENY]** The hook denies `WebFetch` / `WebSearch` / `Bash` tool calls targeting hosts not on the network allow-list: `*.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, `github.com`, `pypi.org`, `registry.npmjs.org`. For `Bash`, the hook regex-matches common egress patterns (`curl`, `wget`, `git push`, etc.) and extracts the destination host. *Verifiable by spike: `WebFetch https://example.com` → exit 2; `Bash curl example.com` → exit 2.*
- [ ] **[BASH DENY]** The hook denies `Bash` tool calls whose command string invokes `pip`, `pip3`, `npm`, `yarn`, `pnpm` with `install`/`add` verbs, or contains `curl ... | sh` / `wget ... | sh` patterns. *Verifiable by red-team spike.*
- [ ] **[ESCAPE HATCH]** `~/.skills-watch/config.json` holds the persistent allow-list (`allow_paths: [...]`, `allow_hosts: [...]`). Managed via three CLI subcommands, all idempotent:
  - `npx skills-watch allow add <path>` / `add-host <domain>`
  - `npx skills-watch allow remove <path>` / `remove-host <domain>`
  - `npx skills-watch allow list`
  On block, the stderr names the exact `skills-watch allow add` command the user can run. The config file is the single source of truth — no fragile reliance on environment-variable propagation through Claude Code's subprocess boundary. *Verifiable by spike: `skills-watch allow add ~/.gitconfig`, re-run blocked action, observe allow.*
- [ ] **[LIVE LOG]** Every hook invocation (allow or deny) appends one line to `~/.skills-watch/live.log` in the format `<ISO8601> [ALLOW|BLOCK] <TOOL> <OBJECT>`. File is truncated once it exceeds 10 MB. *Verifiable by spike: invoke 3 tool calls, diff log tail against expected lines.*
- [ ] **[LATENCY]** Hook wall-clock overhead per tool call ≤ **20 ms** on a 2023-era laptop. (Rubric latency floor is the user-perceived lag; anything ≤ 20 ms is sub-perceptible and won't noticeably slow the agent.) *Verifiable by `spikes/perf_hook.py`: run 1000 benign tool calls with and without the hook installed, compare.*
- [ ] **[DISTRIBUTION]** Installed via `npx skills-watch install` with no required global install and no pre-install configuration. Uninstalled via `npx skills-watch uninstall` which cleanly removes the hook entry. *Verifiable by clean-laptop install + uninstall walkthrough.*

# 🎯 Business Rubric (Level 1)
*Economic binary pass/fail. What must be true for the business to work?*

- [ ] **[TIME-TO-USER]** v0 is used by a real, external, non-author developer ≤ **14 calendar days** from rubric approval. *Verifiable by a timestamped public artifact (tweet, Discord message, email) from that user.*
- [ ] Time-to-first-report for a new user is under **60 seconds**, demonstrable in a side-by-side video against NoNo's manual setup process. *Verifiable by the side-by-side clip itself.*
- [ ] Week-1 distribution plan (skills.sh community post + HN Show) results in **≥ 10 unique non-author users running `npx skills-watch install` AND subsequently invoking at least one skill in Claude Code with the hook active**, logged by opt-in telemetry on the install + a session-ping from the hook. *Verifies the full install-to-active-use loop.*
- [ ] v0 is explicitly free. Team-tier price planned ≤ $10/dev/mo to anchor against StepSecurity ($16) and Socket ($25). *Verifiable by pricing-page doc at team-tier release.*

# ✅ Done Criteria
- All items in the Product + Technical + Business rubrics PASS.
- User approves the hoisted `README.md`, `PRD.md`, `TECH_PLAN.md` at Phase 2 converge.

---
## 🏁 Defeated Rubrics
- *Yellow/unusual-but-allowed color state — killed for vagueness; antibiotic is red/green binary.*
- *Dynamic SKILL.md-parsed network allow-list — deferred; v0 ships deny-by-default with a hardcoded allow-list.*
- *Arbitrary report-length constraint (≤ 50 lines) — replaced with a strict `SUMMARY:` line format; length is an implementation detail.*
- *"Install events ≥ 20" vanity metric — replaced with "≥ 10 users who install AND invoke" (full activation loop).*
- *Constraints C4.1/C4.2 (observability-first + zero-config) — moved from immutable constraints to Product-rubric guiding principles.*
- *Single 500ms cold-start item — deprecated by R3 pivot; new latency floor is per-tool-call hook overhead.*
- *stdin pass-through — not applicable post-pivot; hooks don't control stdin.*
- *(R3 pivot 2026-04-18):* **`npx skills-watch <skill>` CLI-wrapper model** — killed after constraint audit Round 3 flagged C2.2 as BINDING. The wrapper only caught skill-spawned subprocesses, missing all the agent-mediated tool calls that are where the real pain lives.
- *(R3 pivot):* **SRT as sole enforcement backend** — deferred to v1. v0 uses Claude Code's `PreToolUse` hook with pattern-matching as the enforcement primitive. SRT subprocess wrapping becomes a v1 depth-layer for users who want kernel-enforced isolation on top of pattern-level decisions.
- *(R3 pivot):* **Cold-start + warm latency floors** — replaced with per-tool-call hook overhead (≤ 20ms) since there's no user-perceived cold start in the hook model.
- *(R3 pivot):* **stdin-EOF UX-INTERACTIVE item** — removed; hooks can't control stdin, and the install-once model means interactive skills run normally. A skill-specific interactive-override is v1 territory.
- *(R3 pivot):* **Filesystem-denyRead trick for process deny-list** — removed; in the hook model we pattern-match `Bash` commands directly.
