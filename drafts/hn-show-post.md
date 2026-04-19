# Show HN post — skills-watch v0.3

## Title
Show HN: skills-watch – runtime security for Claude Code agent skills

## Body

Hi HN. I'm shipping **skills-watch**, a one-line-install runtime guard for Claude Code that polices every tool call the agent makes against a universal deny-list. It installs as a `PreToolUse` hook in Claude Code's own `settings.json`, so once installed it runs on every skill invocation — no per-call flag, no daemon, no shell aliases.

### Why now

- Feb 2026 Snyk [ToxicSkills](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) report: **13.4% of 3,984 audited AI-agent skills had critical security issues; 36% had prompt injection; 1,467 malicious payloads** found. The daily rate of new skill submissions went from <50 to >500 in weeks.
- March 2026: [Check Point disclosed CVE-2025-59536 (CVSS 8.7)](https://research.checkpoint.com/2026/rce-and-api-token-exfiltration-through-claude-code-project-files-cve-2025-59536/) + CVE-2026-21852 — RCE and API-token exfil through Claude Code project files.
- Static scanners (Socket, Snyk, OpenClaw) audit the code *before* it runs. skills-watch does runtime enforcement at the agent's tool-call boundary: even if a static scan missed it, the guard catches the action.

### What it does

Every tool call Claude Code makes (`Bash`, `Read`, `Write`, `Edit`, `WebFetch`, `WebSearch`, etc.) goes through skills-watch's `PreToolUse` hook. The hook pattern-matches against five risk categories and blocks the action if it looks like one of:

- **`SENSITIVE-LEAK`** — reading SSH/AWS/GPG keys, `~/.netrc`, `~/.agents/*.env`, stray `.env` outside cwd, `~/.gitconfig`, `~/.git-credentials`, shell history, or `printenv <SENSITIVE_VAR>`.
- **`PERSISTENCE-ATTEMPT`** — writing to `~/.zshrc`, `~/.bashrc`, cron, launchd, etc.
- **`UNAUTHORIZED-EGRESS`** — POST/PUT/DELETE or `-d @file` patterns to any host.
- **`SUPPLY-CHAIN`** — mid-run `pip install`, `npm install`, `yarn add`, etc.
- **`INGRESS-EXEC`** — `curl | sh`, `chmod +x && ./`, etc.

On a block, Claude gets a 4-line stderr message — the category, a one-line "why this is usually bad", a one-line "when it might actually be fine", and the exact one-line CLI command to allow it — and relays it to you in the conversation. No context-switching, no guessing.

WebFetch to any http(s) host is **allow-and-log** by default (reading a docs page isn't the harm; what the agent does next is). First-time egress to any new host gets a `LOUD` tag in the live log so you can grep for audit.

### The install story

```
npx skills-watch install
```

That's it. Writes three hooks to `~/.claude/settings.json`, creates `~/.skills-watch/config.json`, prints a note to restart your Claude Code session. Uninstall symmetrically: `npx skills-watch uninstall`.

Try before installing:

```
npx skills-watch demo
```

Runs 8 simulated attacks through the real hook. Nothing leaves your machine. You see the 4-line risk-aware explanation for each block.

### Architecture choices

- **Pattern-matching, not a kernel sandbox.** The hook pattern-matches against the tool-call payload Claude Code hands us; we don't wrap subprocesses in seccomp/Landlock. Trade: we can't catch obfuscated Bash (v0.4 target) but every agent tool call gets checked in ≤ 20 ms, and the install story is a single `npx` command with no kernel modules.
- **`risk-copy.json`** — the category copy lives in a committed JSON file, not hardcoded. Tightening the prose doesn't touch code.
- **Five categories, not nine.** Earlier drafts had a finer taxonomy; Gemini's adversarial review said "you're adding UX-copy complexity, not security value — ship five, split later if users ask." We did.
- **OWASP LLM Top 10 (2025) + MITRE ATLAS codes** in the log JSON, not in the user-facing stderr. Harden-runner's precedent — ATT&CK codes are great for SIEMs, not for developers mid-flow.

### Where it's at

- [v0.3.0 on npm](https://www.npmjs.com/package/skills-watch).
- [GitHub: shivag/skills-watch](https://github.com/shivag/skills-watch). 95/95 smoke tests. `npx skills-watch demo` shows the full UX.
- [Compatibility matrix](https://github.com/shivag/skills-watch/blob/main/docs/compatibility.md) — 10 of 12 top skills.sh skills work out of the box; the two exceptions (tango-research, tango-product) tell you the exact one-line override because they read API-key files.
- [Risk categories reference](https://github.com/shivag/skills-watch/blob/main/docs/risk-categories.md) — including a threat-model note on the one honest limit (URL-encoded exfil via allowed GETs, which we defeat at the read-side deny-list).

### Known limits

- Claude Code only in v0.3. Cursor / Codex / Cline / Gemini CLI each have their own tool-call boundaries; those are v1 territory.
- Pattern matching on Bash strings can miss obfuscated payloads (base64, `cmd="sh"; curl | $cmd`, etc.). v0.4 target.
- macOS + Linux (Claude Code itself is the platform floor).

### Open questions I'd love HN's take on

1. Is the `risk-copy.json` approach to user-visible prose the right call, or do security practitioners want raw ATT&CK codes surfaced?
2. How do you feel about the read-side-deny being the defense for URL-encoded exfil rather than a network-layer block?
3. What's your scariest plausible AI-agent threat that you haven't seen mentioned in any of the ToxicSkills / Check Point writeups?

Happy to answer anything. Thanks.
