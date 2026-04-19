# skills-watch

**A one-time-install safety belt for Claude Code.**

Run `npx skills-watch install` once. After that, every skill you invoke in Claude Code — whether you type `/tango-research`, `/my-skill`, or just let Claude use tools on its own — gets guarded automatically. Behind the scenes, a small hook fires before every tool call the agent makes, checks it against a universal deny-list, and blocks the obvious crimes on the spot.

## What it blocks by default

- **Secrets on disk:** `~/.ssh/`, `~/.aws/`, `~/.gnupg/`, `~/.netrc`, `~/.docker/config.json`, `~/.agents/.env`, any stray `.env` outside your working directory.
- **Shell history:** `~/.zsh_history`, `~/.bash_history` (the most overlooked PII/secret channel).
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

Idempotent. Writes two hooks to `~/.claude/settings.json` — a `PreToolUse` hook (for enforcement) and a `UserPromptSubmit` hook (for per-skill context tracking) — and creates `~/.skills-watch/config.json` for your allow-list. Preserves any pre-existing Claude Code hooks. **After install, start a new Claude Code session** (Claude Code reads hooks at session start; the current session will run unguarded until it exits).

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

Pre-build. Rubric approved 2026-04-18 via two rounds of Gemini adversarial critique + one constraint-audit pivot + one acceptance round. Target: v0 in a real outside developer's hands within 14 days of rubric approval (i.e. by 2026-05-02).

## License

MIT (forthcoming at v0 release).
