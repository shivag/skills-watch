# Draft GitHub Discussion on anthropics/skills

**Target:** https://github.com/anthropics/skills/discussions
**Category:** Show and tell (or Ideas if Show-and-tell isn't available)
**Title:** Runtime guard for skill tool-calls — skills-watch

## Body

Hey all — I've been building **[skills-watch](https://github.com/shivag/skills-watch)**, a runtime guard for Claude Code agent skills, and wanted to share it here since it's most useful for folks using skills from this repo + skills.sh generally.

### The install story

```bash
npx skills-watch install
```

This writes three hooks (`PreToolUse`, `UserPromptSubmit`, `SessionStart`) to your `~/.claude/settings.json`. After restarting your Claude Code session, every tool call the agent makes gets checked against a small universal deny-list — SSH keys, AWS creds, shell history, git identity, sensitive env vars, `pip install` mid-run, exfil POSTs, `curl | sh` chains, writes to shell RC files. On a block, Claude gets a plain-English explanation (`RISK:`, `WHEN IT MIGHT BE FINE:`, `TO ALLOW:`) and relays it to you.

### Compatibility with skills in this repo

I ran the top 10 skills through the hook to see what would happen (see the [compatibility matrix](https://github.com/shivag/skills-watch/blob/main/docs/compatibility.md)). TL;DR: **10 of 12 work out of the box**. Tango-research and tango-product need a one-line override for their Gemini key file, which the BLOCKED message tells you how to do. Everything else — pdf, xlsx, docx, pptx, skill-creator, consolidate-memory, frontend-design — just works.

### Why not a static auditor?

skills.sh already has [/audits](https://skills.sh/audits) aggregating Socket + Snyk + Gen Agent Trust Hub verdicts, which is great. skills-watch is the **runtime** layer: even if a static scan said "looks fine," we still check each actual tool call when the skill runs. Complements rather than competes.

### Open to feedback on

- Category taxonomy (we ship 5 plain-English risk labels — `SENSITIVE-LEAK`, `PERSISTENCE-ATTEMPT`, `UNAUTHORIZED-EGRESS`, `SUPPLY-CHAIN`, `INGRESS-EXEC`). OWASP / ATLAS codes in the log JSON only.
- Known limits: pattern matching on Bash, not a kernel sandbox. Obfuscated payloads are a v0.4 target.
- Any skills in this repo that break under v0.2? Bug reports very welcome.

Try the 30-second demo even if you don't want to install: `npx skills-watch demo` runs 8 simulated attacks through the real hook binary, locally.

Thanks.
