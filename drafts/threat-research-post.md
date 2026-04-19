# Draft threat-research post: mapping the skills-watch compat matrix to Snyk's ToxicSkills findings

**Target:** personal blog / dev.to / cross-post to HN
**Proposed title:** "I ran skills-watch against the top 10 skills.sh skills. Here's what happens when I plug the same hook against the 534 critical-risk skills Snyk found."

## Post outline

### 1. The context
[Snyk ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) Feb 2026:
- 3,984 skills audited
- 534 flagged critical
- 1,467 malicious payloads
- 91% of confirmed malicious samples combine prompt injection with traditional malware

These are static-audit findings. The remaining question: when a user installs one of these flagged skills anyway (maybe the audit happens late, maybe the user doesn't check, maybe the skill was clean when audited and got hijacked), does runtime enforcement catch the bad behavior?

### 2. The setup
Short description: skills-watch v0.3, installed via `npx skills-watch install`. Three hooks (`PreToolUse` for enforcement, `UserPromptSubmit` for skill-context, `SessionStart` for banner). All tool calls logged to `~/.skills-watch/live.log` with risk category enrichment.

### 3. The compat matrix — baseline trust
Link to [`docs/compatibility.md`](https://github.com/shivag/skills-watch/blob/main/docs/compatibility.md). Short callout: 10 of 12 top-ranked skills just work. The two exceptions (tango-research, tango-product) read a dedicated API-key file and tell you exactly how to override per-skill.

### 4. The ToxicSkills mapping
For each of the top attack patterns Snyk found:

- **Data exfiltration (6,451 matches)** — Snyk pattern: POST to unknown host or file-write to a network mount. skills-watch pattern: `EGRESS_DATA_PATTERNS` catches `-X POST`, `-d @`, `--data-binary @`. Verdict: **BLOCKED as `UNAUTHORIZED-EGRESS`** before the attack can land.
- **Credential theft (598 matches)** — Snyk pattern: read of `~/.ssh/`, `~/.aws/`, or env-var harvesting. skills-watch pattern: `DENY_PATHS_RAW` + `VAR_READ_PATTERNS`. Verdict: **BLOCKED as `SENSITIVE-LEAK`**.
- **Reverse shell (33 matches)** — Snyk pattern: `curl | sh` or `bash -i >& /dev/tcp/...`. skills-watch pattern: `INGRESS_EXEC_PATTERNS`. Verdict: **BLOCKED as `INGRESS-EXEC`**.
- **Social engineering (2,652 matches)** — Snyk pattern: prompt-injection-via-fetched-content. skills-watch: we don't detect prompt injection *itself* yet (v0.4 target), but the downstream actions (exfil, creds, reverse shell) all still block. The injection reaches Claude; the compromise doesn't.
- **Obfuscation (35,705 matches, mostly base64)** — skills-watch has an honest limit here: base64-encoded Bash can slip past pattern matching. v0.4 target: shell-context-aware matching. Document this.

### 5. The honest limit: prompt injection + ambient metadata
Skills-watch doesn't detect prompt injection itself (91% of Snyk's malicious chains start here). What it does: blocks the *downstream action* the injected prompt tries to drive. This is useful because injection alone, without actionable output, can't harm the user. But it's a defense-in-depth, not a surgical defense. v0.4 + v0.5 work.

### 6. The ask
Run `npx skills-watch demo` (takes 30 seconds, nothing leaves your machine) and tell me what you think. If you use a skill not in the compat matrix, file an issue with the name and I'll add it.

Written to support shipping v0.3 to npm + Show HN.
