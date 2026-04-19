# skills-watch

**A one-time-install safety belt for Claude Code.**

[![Guarded by skills-watch](https://img.shields.io/badge/guarded%20by-skills--watch-2ea44f)](https://github.com/shivag/skills-watch)

> [Snyk's Feb 2026 ToxicSkills study](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) found **13.4% of 3,984 AI agent skills had critical security issues**, **36% had prompt injection**, and **1,467 malicious payloads** across the ecosystem — including [CVE-2025-59536 and CVE-2026-21852](https://research.checkpoint.com/2026/rce-and-api-token-exfiltration-through-claude-code-project-files/), RCE + API-token exfiltration through Claude Code project files. The skills you're running today aren't all safe.

One line fixes it:

```
npx skills-watch install
```

Every tool call Claude Code makes now gets checked against a universal deny-list. SSH keys, AWS creds, git identity, shell history, API-key sniffing, mid-run installs, exfiltration to non-allowlisted hosts — all blocked by default. When a block fires, Claude tells you in plain language, with the exact one-line command to permanently allow it if it was legitimate.

### See it work in 30 seconds, before you install

```
npx skills-watch demo
```

Runs 7 simulated attacks (all locally generated — nothing leaves your machine) against the real hook binary. You watch each one get blocked with an actionable override command. Install-to-value moment, no commitment.

---

## What it blocks by default

- **Secrets on disk:** `~/.ssh/`, `~/.aws/`, `~/.gnupg/`, `~/.netrc`, `~/.docker/config.json`, `~/.agents/.env`, any stray `.env` outside your working directory.
- **Shell history:** `~/.zsh_history`, `~/.bash_history` (the most overlooked PII/secret channel).
- **Shell RC files (write-denied):** `~/.zshrc`, `~/.bashrc`, `~/.bash_profile`, `~/.zprofile`, `~/.profile`, crontab — no persistent backdoors. (Reads are allowed; writes are blocked.)
- **Global git identity & credentials:** `~/.gitconfig`, `~/.git-credentials`, `~/.config/git/credentials`. Local `<cwd>/.git/` stays fully usable so legitimate commits still work.
- **Outbound network:** deny-by-default except `*.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, `github.com`, `pypi.org`, `registry.npmjs.org`.
- **Mid-run package installs:** `pip install`, `npm install`, `curl | sh`, `wget | sh`, etc.
- **API-key-sniffing commands:** `printenv ANTHROPIC_API_KEY`, `env | grep AWS_*`, and so on.

When something gets blocked, the agent sees the block and tells you in plain language — including the exact one-line command to allow that thing if it was legitimate. If you were in a specific skill when the block fired (e.g. you typed `/tango-research` earlier), the suggested command is **scoped to that skill**, so the allowance doesn't leak to random community skills:

```
BLOCKED: READ /Users/you/.agents/tango.env — to allow for tango-research, run:
npx skills-watch allow add --for tango-research /Users/you/.agents/tango.env
```

If no slash command was active, the suggestion is global (applies to every skill). Users default into the tight per-skill scope.

## Install

```
npx skills-watch install
```

Idempotent. Writes three hooks to `~/.claude/settings.json`:

- **`PreToolUse`** — the enforcement core. Fires before every tool call; checks against the deny-list; exits 2 + stderr on block.
- **`UserPromptSubmit`** — extracts the active slash command (e.g. `/tango-research`) into a sidecar so per-skill allow-lists apply.
- **`SessionStart`** — on every new Claude Code session, prints a banner (`⚡ skills-watch active — N deny-list rules`) so you always know you're guarded, and injects a brief into Claude's context so Claude relays block suggestions cleanly.

Also creates `~/.skills-watch/config.json` for your allow-list. Preserves any pre-existing Claude Code hooks. **After install, start a new Claude Code session** (Claude Code reads hooks at session start; the current session will run unguarded until it exits).

## Usage

After install, nothing to prepend. Just use Claude Code normally:

```
> /tango-research design a passive pressure regulator
```

Every tool call the agent makes is now guarded. Blocks surface inline in your conversation. Full log at `~/.skills-watch/live.log`.

### Live observability

In a second terminal:

```
tail -f ~/.skills-watch/live.log
```

```
2026-04-18T17:41:22.031Z  ALLOW  Bash      cd /tmp/scratch && python3 ...
2026-04-18T17:41:22.448Z  ALLOW  Read      ./rubric.md
2026-04-18T17:41:22.612Z  ALLOW  WebFetch  generativelanguage.googleapis.com
2026-04-18T17:41:23.017Z  BLOCK  Read      /Users/you/.ssh/id_rsa
```

### Summary

```
npx skills-watch summary --since 1h
```

```
SUMMARY: 47 tool calls, 2 BLOCKED (since 2026-04-18T16:41:00Z)
```

### Managing the allow-list

The allow-list has **two tiers**: global (applies to every skill) and per-skill (applies only when that slash command is active).

```
# Global — applies to every skill you invoke
npx skills-watch allow add ~/.gitconfig
npx skills-watch allow add-host api.mysite.com

# Per-skill — applies only while that skill is the active slash command
npx skills-watch allow add --for tango-research,tango-product ~/.agents/tango.env
npx skills-watch allow add-host --for tango-research generativelanguage.googleapis.com

npx skills-watch allow list
npx skills-watch allow remove --for tango-research ~/.agents/tango.env
```

Per-skill scoping works because skills-watch installs two hooks: `UserPromptSubmit` captures the slash command you typed into `~/.skills-watch/current-skill`; `PreToolUse` reads that sidecar to know which per-skill allow-list to union with the global one. Follow-up messages without a slash command keep the last known skill context, so a long tango session stays correctly scoped.

When a skill is blocked by the deny-list, the `BLOCKED` message in Claude's response includes the exact per-skill command to allow it — e.g. `npx skills-watch allow add --for tango-research ~/.agents/tango.env`. One keystroke from the error to the fix, with the tight scope pre-filled.

### Works with tango-research and tango-product

Both tango skills (v1.0.0+) prefer `~/.agents/tango.env` for their Gemini API key (falling back to `~/.agents/.env` for existing users). After installing skills-watch, allow the tango key only for tango-family skills:

```
npx skills-watch install
npx skills-watch allow add --for tango-research,tango-product ~/.agents/tango.env
```

Tango works normally; a random community skill cannot read your Gemini key.

## Uninstall

```
npx skills-watch uninstall
```

Removes only the `skills-watch-hook` entry from `~/.claude/settings.json`. Leaves other hooks intact. Preserves your allow-list in `~/.skills-watch/config.json` in case you reinstall.

## Honest limits

- **Pattern-matching is defeatable.** A skill that base64-encodes a malicious Bash command can slip past the regex check. v0 catches the common attack pattern; v1 plans to add SRT subprocess wrapping as a kernel-enforced second layer.
- **Claude Code only.** Cursor, Codex, Cline, Gemini CLI all have their own tool-call boundaries that each need a dedicated integration. v1 expansion.
- **No mid-tool observability.** Claude Code hooks fire pre- and post-tool, not during. Long `Bash` calls are visible at entry and exit but not in between.
- **macOS and Linux only** (inherits Claude Code's platform support).

## Further reading

- **[PRD.md](./PRD.md)** — full product spec, rubric-traced.
- **[TECH_PLAN.md](./TECH_PLAN.md)** — architecture, component breakdown, verification spikes.
- **[tango/](./tango/)** — the full Tango debate archive that produced this product: rubric, arena, Gemini critiques, competitor teardowns, ICP, niche expansion.

## Status

**v0.1.0 — 2026-04-18.** 41/41 smoke tests pass. Three hooks (PreToolUse + UserPromptSubmit + SessionStart). `demo` subcommand. Published-ready but awaiting `npm publish` (maintainer task).

Until it lands on npm, try it locally:

```bash
git clone https://github.com/shivag/skills-watch.git
cd skills-watch
npm link                    # exposes all four bins globally
skills-watch demo           # 30-second proof-of-value
skills-watch install        # then restart your Claude Code session
skills-watch status
tail -f ~/.skills-watch/live.log    # in a second terminal
```

Uninstall locally with `npm unlink -g skills-watch` in the repo directory, then `skills-watch uninstall` (which cleans the hook entries from `~/.claude/settings.json`).

Rubric, PRD, and TECH_PLAN were developed in a tango-product session under `tango/2026-04-18_mvp-shape/` — full debate archive is in that folder.

## Development

```bash
npm test           # runs the smoke suite (no external deps)
```

Source layout:
- `bin/skills-watch.js`, `bin/skills-watch-hook.js`, `bin/skills-watch-prompt-hook.js`, `bin/skills-watch-session-hook.js` — entry points
- `src/cli.js` — all CLI subcommands (install, uninstall, status, summary, demo, allow)
- `src/hook.js` — `PreToolUse` decision logic (`decide()` is pure-function testable)
- `src/prompt-hook.js` — `UserPromptSubmit` skill-extraction
- `src/session-hook.js` — `SessionStart` welcome banner + Claude context injection
- `src/demo.js` — 7 pre-baked attack scenarios piped through the real hook binary
- `src/policy.js` — universal deny-list data + pattern matchers
- `src/common.js` — shared paths, config I/O, settings.json merge, stdin reader, env-var overrides (`SKILLS_WATCH_FORCE_SKILL`, `SKILLS_WATCH_NOLOG` for the demo)

## For skill authors — claim the badge

If your skill works cleanly under skills-watch, add the badge to your README:

```markdown
[![Guarded by skills-watch](https://img.shields.io/badge/guarded%20by-skills--watch-2ea44f)](https://github.com/shivag/skills-watch)
```

Or, if your skill needs a specific path/host on the allow-list, document it clearly in your SKILL.md or README, ideally with the exact one-line override:

```markdown
If you use skills-watch, allow the config file for this skill:

    npx skills-watch allow add --for your-skill-name ~/.config/your-skill/settings.json
```

## License

MIT (forthcoming at v0 release).
