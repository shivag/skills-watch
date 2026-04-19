# skills-watch v0.3 rubric — adoption wave

v0.3 is a **distribution + visibility** release, not a security-enforcement release. After v0.2 shipped risk-aware blocks, the biggest gap is *nobody knows the tool exists*. v0.3 closes that gap without adding new enforcement logic.

Three items:
1. **Distribution** — `npm publish` + Show HN + badge + community posts.
2. **`skills-watch risk` dashboard** — a reader over existing live-log + config, surfaces what the guard has been doing.
3. **`docs/compatibility.md`** — empirical matrix of what the top 10 skills.sh skills do under skills-watch v0.2.

Prior-session constraints + rubric items from `2026-04-18_mvp-shape` and `2026-04-19_risk-aware-blocks` remain in force.

---

# 🔒 Immutable Constraints (v0.3)

- **C6.1 (inherent: no new enforcement surface)** v0.3 adds NO new deny-list entries, NO new risk categories, NO new block paths. If v0.3 changes what gets BLOCKED, it's scope creep and should be deferred. The dashboard and compat doc are pure *reads* over existing state. — *Justification: the antibiotic-lens rubric check on the original v0.3 backlog showed most enforcement improvements were vitamins. v0.3 is about visibility + adoption, full stop.*
- **C6.2 (biz: v0.3 ships in ≤ 5 calendar days)** Distribution item starts on day 0 (npm publish); dashboard + compat-doc ship by day 3; HN/community posts by day 5. Shorter than v0.2's 7-day floor because the only code delta is ~80 LOC of dashboard. — *Justification: momentum and market timing — CVE-2025-59536 disclosure is still fresh; the window for "run this to avoid the thing you just read about" is now.*
- **C6.3 (mkt: adoption measured, not inferred)** v0.3 success is measured by at least ONE verifiable, timestamped non-author artifact (tweet / HN comment / GitHub issue / installation ping) within 7 days of npm publish. If zero artifacts appear, we reassess the pitch before spending more build effort. — *Justification: the v0.2 rubric's `[TIME-TO-USER]` item has been pending since v0.1; this is the test.*
- **C6.4 (inherent: compat matrix is empirical)** Every row in `docs/compatibility.md` is labeled either **VERIFIED** (we ran the skill under the hook and captured real log output) or **PREDICTED** (inferred from SKILL.md alone). No mixed claims. Verified rows quote actual BLOCKED stderr or ALLOW log lines verbatim. — *Justification: a "compatibility matrix" that's 90% speculation is worse than nothing — it looks authoritative and misleads.*

---

# 🎯 Product Rubric (v0.3)
*Guiding principles inherited: observability is the product, zero-config at first run, risk-literacy is the second surface.*

- [ ] **[PAINKILLER — distribution]** After `npm publish`, a user can run `npx skills-watch install` from any machine (no clone, no npm link) and it works. *Verifiable by: package page exists at `https://www.npmjs.com/package/skills-watch`, `npx skills-watch --version` prints `0.3.0` from a clean laptop.*
- [ ] **[PAINKILLER — dashboard]** `npx skills-watch risk` (or `risk --since 1h`) prints a single-screen summary: total tool calls, blocks grouped by risk category, first-seen hosts from the last session, top-5 most-active per-skill contexts. No new enforcement, no daemon, no tailing — just structured reading of `~/.skills-watch/live.log` and `~/.skills-watch/config.json`. *Verifiable by: scripted tool-call sequence + golden-file test of the dashboard output.*
- [ ] **[PAINKILLER — compat]** `docs/compatibility.md` covers ≥10 skills.sh skills. For each: works-out-of-box (✓) OR one-line override (copy-paste ready). At least 5 rows VERIFIED (not just predicted). *Verifiable by: row count, VERIFIED-label presence, manual read-review that every override command is syntactically valid.*
- [ ] **[FRICTION — no new config]** `risk` dashboard uses ONLY existing state (live.log + config.json + seen-hosts). Zero new files, zero new env vars, zero new CLI flags beyond `--since`. *Verifiable by: diff of `~/.skills-watch/` after `risk` runs → unchanged.*
- [ ] **[CLARITY — dashboard format]** `risk` output opens with a one-line summary (`SKILLS-WATCH RISK: <N> calls, <K> blocked, <J> first-seen hosts in last session`) and never exceeds 30 lines of terminal output. *Verifiable by: line-count assertion.*

# 🎯 Technical Rubric (v0.3)

- [ ] **[DASHBOARD-CMD]** `bin/skills-watch.js risk [--since <duration>]` invokes a new subcommand. Arg parsing reuses the existing `parseDuration()` helper from `summary`. No new bin entry. *Verifiable by: `node bin/skills-watch.js risk` returns exit 0 + prints dashboard.*
- [ ] **[DASHBOARD-DATA]** Dashboard reads `~/.skills-watch/live.log`, parses ISO8601 timestamps + verbs + optional `[risk=...]` suffixes, groups by category + host + skill. Reuses the log-parsing logic from `summary` (extract to a shared helper if it simplifies — but no new data format invented). *Verifiable by: unit test with a scripted log file, assert group counts.*
- [ ] **[NPM-PUBLISH-READY]** `package.json` ships with version `0.3.0`, `files` allow-list includes `bin/`, `src/`, `README.md`, `PRD.md`, `TECH_PLAN.md`, `docs/`. `npm pack --dry-run` output is ≤ 100 KB uncompressed and contains no `tango/`, no `test/`, no `.git`. *Verifiable by: run `npm pack --dry-run`, assert tarball contents.*
- [ ] **[COMPAT-DOC-AUTOMATION]** `docs/compatibility.md` is partly auto-generatable: a new throwaway script `scripts/gen_compat.js` (not shipped in the npm package, in `.npmignore`) runs each skill's typical payload through `decide()` and emits a markdown table draft. Author then augments with verified live-log output where available. *Verifiable by: the script exists, runs, produces output matching the committed compatibility.md structure.*
- [ ] **[NO REGRESSION]** v0.2's 78-test smoke suite still passes. v0.3 adds tests for `risk` subcommand + log-parsing helper, never removes. *Verifiable by: `npm test`.*

# 🎯 Business Rubric (v0.3)

- [ ] **[TIME-TO-USER]** ≥1 timestamped non-author artifact (npm install ping, HN comment, tweet, GitHub issue) within **7 calendar days of npm publish**. *Verifiable by: artifact URL captured in `docs/adoption-log.md` or an issue.*
- [ ] **[DISTRIBUTION-PLAN]** Day 0 npm publish. Day 1 Show HN post drafted + submitted with exact title "Show HN: skills-watch — runtime security for Claude Code agent skills". Day 2 PR on `VoltAgent/awesome-agent-skills` + GitHub Discussion on `anthropics/skills`. Day 3 compat-matrix threat-post drafted. *Verifiable by: artifacts on the listed dates.*
- [ ] **[SUCCESS-GATES-NAMED]** The rubric declares in advance what "v0.3 worked" means (C6.3 — ≥1 non-author artifact) and what "v0.3 didn't land" means (zero non-author activity after 7 days → reassess positioning, not build more). *Verifiable by: the gate is literally this rubric item; if no artifact by day 7 we STOP new v0.4 work until we know why.*

---

# ✅ Done Criteria (v0.3)
- All Product + Technical + Business rubrics PASS.
- User approves the v0.3 tag.
- Non-author adoption signal observed (C6.3).

---

## 🏁 Defeated Rubrics — inherited
(All prior defeated items from v0.1 and v0.2 remain dead. Not repeating — see `tango/2026-04-18_mvp-shape/rubric.md` and `tango/2026-04-19_risk-aware-blocks/rubric.md`.)

## 🏁 Defeated Rubrics — v0.3 session

- *(pre-R1):* **Original v0.3 backlog — shell-context-aware pattern matching, PROMPT-INJECT, obfuscated Bash, per-host POST allow** — killed. Antibiotic-lens check showed all four were vitamins vs. the adoption gap. Reassessed after ≥10 real users come through adoption-wave; any genuine user-reported false-positive / missed-attack drives re-prioritization. See tango session 2026-04-19_risk-aware-blocks defeated-rubrics for context.
