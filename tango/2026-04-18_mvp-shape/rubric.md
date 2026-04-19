# 🔒 Immutable Constraints
*Binary rules. Any proposal violating these is instantly rejected. Every sub-item carries a floor tag.*

- **C1.1 (mkt: skills.sh community)** The v0 buyer is a solo developer or small dev-tools team who installs community skills. Not a CISO. Any proposal requiring an enterprise security motion (SOC2, SIEM) is a different product. — *Justification: spikes/icp.md defines the wedge; StepSecurity serves the CISO buyer.*
- **C1.2 (mkt: builder not security-engineer)** The product must provide immediate value with **zero** manual policy authoring. A user must never be forced to write an allow-list to get their first security report. — *Justification: NoNo owns the policy-authoring market; our wedge is zero-config (spikes/competitor_nono.md).*
- **C2.1 (dep: SRT — macOS seatbelt + Linux bubblewrap)** Enforcement is bounded to filesystem and network controls provided by SRT. No syscall filtering, no CPU/memory limits, no Windows support for v0. — *Justification: spikes/substrate_srt.md documents SRT's concrete limits.*
- **C2.2 (dep: skills.sh focus)** v0 is built and marketed for the `skills.sh` install flow. Product name, examples, and core UX target this niche first to win it. Future expansion to other agent-invoked tooling is explicitly allowed, but not a v0 goal. — *Justification: spikes/niche_expansion.md.*
- **C3.1 (biz: v0 GTM)** v0 is free for solo use. Any eventual team tier is priced ≤ $10 / developer / month. The v0 feature set will not be moved behind a paywall. — *Justification: Brackets price below Socket ($25) and StepSecurity ($16) comps.*
- **C3.2 (biz: time-to-ship)** v0 must be in a real external user's hands in ≤ 14 calendar days from rubric approval. — *Justification: Mitigates kill-cases A (Anthropic bakes it into Claude Code) and B (NoNo ships skill registry) from spikes/niche_expansion.md.*

---

# 🎯 Product Rubric (Level 1)
*Guiding principles: (1) Observability is the product; enforcement is a safety net.
(2) First run is zero-config.*

- [ ] **[PAINKILLER]** A new user running `npx skills-watch <skill>` sees a live-streaming report of filesystem, network, and subprocess activity within 5 seconds. Each line is formatted as `[ACTION] [OBJECT]` (e.g. `READ /home/user/.gitconfig`, `CONNECT github.com:443`, `EXEC /usr/bin/python3`). *Verifiable by recorded terminal session on a clean laptop.*
- [ ] **[PAINKILLER]** On a purpose-built red-team skill, the universal deny-list blocks 100% of these attacks **by default**, terminates the skill process immediately, and reports `BLOCKED`: (1) read `~/.ssh/id_rsa`, (2) `curl` to a non-allowlisted host (e.g. `example.com`), (3) `pip install <pkg>` mid-run, (4) write to `~/.zshrc`, (5) read `~/.zsh_history` / `~/.bash_history`, (6) read `~/.gitconfig` to exfil user name/email, (7) read `~/.git-credentials`. *Verifiable by `spikes/redteam_<N>.py` producing a BLOCKED verdict for each.*
- [ ] **[PAINKILLER]** On a purpose-built red-team skill, an attempt to read a scrubbed environment variable (e.g. `printenv ANTHROPIC_API_KEY`) yields an empty/undefined value. *Verifiable by spike: script runs inside sandbox and reports `''` as value.*
- [ ] **[FRICTION]** From a state of "I have Node.js installed" to "I am seeing a skills-watch report for a skill" is **one command** (`npx skills-watch <skill>`) and **zero prompts**. No login, no config file creation, no API keys. *Verifiable by new-user walkthrough.*
- [ ] **[CLARITY]** The final line of output is a summary: `SUMMARY: 12 file reads, 3 network calls, 1 subprocess. 0 actions blocked.` or `SUMMARY: 4 file reads, 1 network call. 1 action BLOCKED.`. *Verifiable by format spec + parser test.*
- [ ] **[CLARITY]** The live stream uses two colors: default terminal color for allowed actions, bright red for any action that was `BLOCKED`. No other color states. *Verifiable by visual inspection.*
- [ ] **[CLARITY]** Every `BLOCKED` line is actionable: it states exactly what was blocked AND suggests the immediate override. Format: `BLOCKED: [ACTION] [OBJECT] — to allow this run, rerun with: --allow <path>  |  --allow-host <domain>`. *Verifiable by format spec; turns a hard "no" into a "not yet" without requiring users to read docs first.*
- [ ] **[UX-INTERACTIVE]** By default, skills-watch does NOT pass stdin to the sandboxed skill process. An attempted stdin read receives immediate EOF. On first-run, the user is shown a one-time notice: `NOTE: interactive skills that require input are not supported in v0.` *Verifiable by spike: skill that tries to read stdin receives EOF; first-run notice appears exactly once.*

# 🎯 Technical Rubric (Level 1)
*Engineering binary pass/fail. What must be true for the system to actually work?*

- [ ] SRT (`@anthropic-ai/sandbox-runtime`) is the sole enforcement backend for v0. Settings are programmatically generated from the universal deny-list. *Verifiable: `srt --settings <path>` invocation visible in trace logs.*
- [ ] Universal filesystem deny-list covers at minimum: `~/.ssh/`, `~/.aws/`, `~/.gnupg/`, `~/.netrc`, `~/.docker/config.json`, `~/.agents/.env`, `~/.zsh_history`, `~/.bash_history`, `~/.gitconfig`, `~/.git-credentials`, `~/.config/git/credentials`, any `.env` outside the skill's CWD. *Verifiable by unit test against each path.*
- [ ] **[GIT POLICY]** Git access is split cleanly:
  - **Allow:** `<cwd>/.git/` read+write (legit skill commits into the current repo).
  - **Deny:** `~/.gitconfig`, `~/.git-credentials`, `~/.config/git/credentials` (covered in the filesystem deny-list above).
  - **Network:** `git push` / `git clone` work only to hosts in the network allow-list (`github.com` is included by default).
  *Verifiable by red-team spike: skill in cwd can `git add/commit` but CANNOT read user's global git identity or credentials.*
- [ ] **[ESCAPE HATCH]** CLI accepts `--allow <path>` (repeatable) to un-deny specific filesystem paths for a single invocation, and `--allow-host <domain>` (repeatable) to un-deny specific hosts. Usage: `npx skills-watch --allow ~/.gitconfig --allow-host api.mysite.com <skill>`. Flags are explicit and per-run — no persisted config. *Verifiable by spike: a skill that reads `~/.gitconfig` fails by default, succeeds with `--allow ~/.gitconfig`.*
- [ ] Universal network access is **DENY-BY-DEFAULT**. A hardcoded allow-list permits egress ONLY to: `*.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, `github.com`, `pypi.org`, `registry.npmjs.org`. *Verifiable by unit test.*
- [ ] Env-var scrubbing unsets `AWS_*`, `ANTHROPIC_*`, `OPENAI_*`, `GEMINI_*`, `GOOGLE_*`, `GITHUB_TOKEN`, `NPM_TOKEN`, `SSH_*` before the sandboxed process starts. *Verifiable by subprocess inspection.*
- [ ] Mid-run package-manager invocations (`pip`, `npm`, `npx`, `curl`, `wget`) are blocked via a process-path deny-list. *Verifiable by red-team spike.*
- [ ] **[LATENCY-PRIME]** On a clean laptop (no prior `skills-watch` install), total time from pressing Enter on `npx skills-watch <skill>` to first line of output ≤ **10 seconds** on a 50 Mbps connection. Includes npm registry fetch + dependency install. *Verifiable by `spikes/perf_cold_prime.py` with network throttle.*
- [ ] **[LATENCY-WARM]** On a laptop where `skills-watch` is npm-cached, total time from Enter to first line of output ≤ **1 second**. *Verifiable by `spikes/perf_warm.py`.*
- [ ] CLI exit code: `0` if the skill runs to completion with no blocked actions; non-zero if any action is blocked. *Verifiable by scripting test.*
- [ ] The tool is distributed as an npm package runnable via `npx skills-watch`, with no required global install and no pre-run configuration. *Verifiable by clean-laptop install walkthrough.*

# 🎯 Business Rubric (Level 1)
*Economic binary pass/fail. What must be true for the business to work?*

- [ ] **[TIME-TO-USER]** v0 is used by a real, external, non-author developer ≤ **14 calendar days** from rubric approval. *Verifiable by a timestamped public artifact (tweet, Discord message, email) from that user.*
- [ ] Time-to-first-report for a new user is under **60 seconds**, demonstrable in a side-by-side video against NoNo's manual setup process. *Verifiable by the side-by-side clip itself.*
- [ ] Week-1 distribution plan (skills.sh community post + HN Show) results in **≥ 10 unique non-author users successfully executing a skill run that completes without any BLOCKED actions**, logged by opt-in telemetry. *Verifies frictionless value delivery, not tool invocations that fail because our deny-list was too aggressive.*
- [ ] v0 is explicitly free. Team-tier price planned ≤ $10/dev/mo to anchor against StepSecurity ($16) and Socket ($25). *Verifiable by pricing-page doc at team-tier release.*

# ✅ Done Criteria
- All items in the Product + Technical + Business rubrics PASS.
- User approves the hoisted `README.md`, `PRD.md`, `TECH_PLAN.md` at Phase 2 converge.

---
## 🏁 Defeated Rubrics
- *Yellow/unusual-but-allowed color state — killed for vagueness; antibiotic is red/green binary.*
- *Dynamic SKILL.md-parsed network allow-list — deferred; v0 ships deny-by-default with a hardcoded allow-list.*
- *Arbitrary report-length constraint (≤ 50 lines) — replaced with a strict `SUMMARY:` line format; length is an implementation detail.*
- *"Install events ≥ 20" vanity metric — replaced with "≥ 10 users successfully executing a skill run without BLOCKED actions" (full frictionless loop).*
- *Constraints C4.1/C4.2 (observability-first + zero-config) — moved from immutable constraints to Product-rubric guiding principles; strong principles, not laws of physics.*
- *Single 500ms cold-start item — split into LATENCY-PRIME (≤ 10s on clean machine with npx download) and LATENCY-WARM (≤ 1s when cached) to honestly capture both first-impression and repeat-use latency.*
- *stdin pass-through — rejected; v0 blocks stdin with EOF and a one-time notice. Interactive skills are v1 territory.*
