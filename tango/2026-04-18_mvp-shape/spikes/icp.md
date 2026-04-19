# ICP sketch: skills-watch

## Who is the buyer?
**Solo developer or small dev-tools team using AI coding agents (Claude Code, Cursor, Codex, Cline, Gemini CLI) who installs skills from the skills.sh community.**

Narrower cut of that group — the wedge:
- Already runs at least one AI agent that reads skills (most likely Claude Code, which is the most skill-active community right now).
- Has installed at least one community skill via `npx skills add <owner/repo>` from an author they don't personally know.
- Is security-aware enough to have felt the "wait, what does this thing actually do on my machine?" moment at least once.
- Has Python or Node on their machine and runs commands in a terminal daily (so a CLI tool fits existing muscle memory).
- Not a CISO. Not a SecOps engineer. A builder who wants to keep building without becoming a full-time sandbox-policy author.

Title examples that fit: full-stack engineer at a seed-to-Series-A startup, independent consultant, staff engineer at a larger co who uses AI agents for side projects, technical founder.

## What pain are they feeling today?

1. **The "just piped this to my shell" anxiety** — `npx skills add some-random-repo` is almost identical to `curl | sh` with the same trust problem. Community skills have no pre-install scrutiny.
2. **No visibility into what a skill did.** After a skill runs, the only log is the agent's transcript. There's no "it read these 47 files and hit these 3 hosts" summary.
3. **No kill-switch for obvious crimes.** If a skill does try to exfiltrate `~/.ssh/id_rsa`, nothing stops it today. The user finds out when their keys are posted to Pastebin.
4. **Existing tools require policy authoring.** NoNo and SRT both work, but they need per-skill allow-lists to be useful. That's work. Most users won't do it.

## What do they do today to cope?

- Don't install skills. (Biggest coping strategy — suppresses demand.)
- Install skills anyway and rely on trust signals: skill author reputation, GitHub stars, whether they recognize the name.
- Read the SKILL.md by hand before installing. (Works until a skill has nested scripts or dynamic behavior.)
- Run AI agents inside a Docker container or a VM. (Heavy, breaks the laptop dev loop.)
- Don't install skills from skills.sh at all — only install skills they've written themselves or from Anthropic's own repos.

## What's the wedge — the one thing we do that makes them switch?

**"`npx skills-watch <skill>` — know what a skill is doing, block the obvious crimes, zero config."**

That's the entire pitch. It replaces the "install and hope" habit with "install-and-watch" as the default muscle memory. No policy authoring, no DevOps setup, no VM. One command prepended to what they already type.

## Anti-ICP (who this is NOT for)
- **Enterprises with CISO-led tooling budgets** — they'll buy from Snyk / Socket / enterprise vendors, not a solo-dev-shaped CLI.
- **Security engineers at large cos** — they want full policy authoring, EDR integration, SIEM pipelines; skills-watch's "zero config" is a feature they'd want to turn off.
- **Non-agent-users** — anyone not running Claude Code / Cursor / similar doesn't have the pain yet.
- **Windows devs** — SRT substrate is macOS + Linux only; v0 doesn't serve them.
