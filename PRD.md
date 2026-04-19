# skills-watch — Product Requirements Document

Source: hoisted from `tango/2026-04-18_mvp-shape/arena.md` at Phase 2 convergence on 2026-04-18. Every user story below traces to one or more rubric items from `tango/2026-04-18_mvp-shape/rubric.md` and is evidenced by spikes committed under `tango/2026-04-18_mvp-shape/spikes/`.

---

## Rubric trace (user-story → rubric item)

| User story | Rubric item(s) |
|---|---|
| Target user's pain is real and quantified | `C1.1`, `C1.2`, `spikes/icp.md` |
| Install is one command, zero prompts | `[FRICTION]`, `[UX-INSTALL]` |
| Every tool call is logged to a tailable file | `[PAINKILLER — live log]`, `[CLARITY — log format]`, `[LIVE LOG]` |
| Universal deny-list blocks obvious crimes | `[PAINKILLER — block-on-use]`, `[FILE DENY]`, `[NET DENY]`, `[BASH DENY]`, `[GIT POLICY]` |
| API-key-sniffing commands are detected | `[PAINKILLER — env-var read detection]` |
| Blocked actions surface an actionable override | `[CLARITY — actionable BLOCKED]` |
| Escape hatch is a persistent, CLI-managed allow-list | `[ESCAPE HATCH]` |
| Session counts are on-demand via CLI | `[CLARITY — summary CLI]` |
| v0 targets Claude Code specifically | `C2.2 (dep: Claude Code agent tool loop)` |
| v0 is free for solo use | `C3.1 (biz: v0 GTM)` |
| v0 ships in ≤ 14 days | `C3.2 (biz: time-to-ship)`, Business `[TIME-TO-USER]` |

---

## Target user

A solo developer or small dev-tools team who uses **Claude Code** (with occasional Cursor / Codex / Cline / Gemini CLI on the side) and installs community skills via `npx skills add <owner>/<repo>`. They are a *builder*, not a security engineer. They have hit the "wait, what does this thing actually do on my laptop?" moment at least once and stalled their skill adoption because of it. v0 is Claude-Code-first; cross-agent support is an explicit v1+ path.

*Cites: `C1.1 (mkt: skills.sh community)`, `C1.2 (mkt: builder not security-engineer)`, `C2.2 (dep: Claude Code agent tool loop)`, `spikes/icp.md`.*

---

## The one-command install — everything after is automatic

Entire v0 UX:

```
npx skills-watch install
```

What that does: writes a `PreToolUse` hook into `~/.claude/settings.json` pointing at `skills-watch-hook`. Idempotent (re-running is a no-op). If the user already has hooks, it merges instead of clobbering. No login, no account creation, no config file, no API key — *zero prompts between install and value.*

*Cites: `[FRICTION]`, `[UX-INSTALL]`.*

After that, nothing to prepend, nothing to remember. Every time the user invokes a skill in Claude Code:

```
> /tango-research design a passive pressure regulator
```

…the hook fires on every tool call the agent makes underneath (`Bash`, `Read`, `Write`, `Edit`, `WebFetch`, `WebSearch`). Each call is checked against the universal deny-list. Each is logged to `~/.skills-watch/live.log`. Users who want to see what's happening in real time run `tail -f ~/.skills-watch/live.log` in a second terminal:

```
2026-04-18T17:41:22.031Z  ALLOW  Bash      cd /tmp/scratch && python3 -c "print('hi')"
2026-04-18T17:41:22.448Z  ALLOW  Read      ./rubric.md
2026-04-18T17:41:22.612Z  ALLOW  WebFetch  generativelanguage.googleapis.com
2026-04-18T17:41:23.017Z  BLOCK  Read      /Users/shiva/.ssh/id_rsa
```

Users who don't care to watch live just let it run; blocks still surface inline in the Claude Code conversation.

*Cites: `[PAINKILLER — live log]`, `[CLARITY — log format]`.*

---

## What skills-watch blocks by default

Without any configuration, the universal deny-list blocks the actions that almost no legitimate skill needs:

- **Secrets on disk** (any `Read`/`Write`/`Edit` targeting these paths): `~/.ssh/`, `~/.aws/`, `~/.gnupg/`, `~/.netrc`, `~/.docker/config.json`, `~/.agents/.env`, any stray `.env` outside the current working directory.
- **Shell history** (the most overlooked PII/secret channel): `~/.zsh_history`, `~/.bash_history`.
- **Global git identity & credentials:** `~/.gitconfig`, `~/.git-credentials`, `~/.config/git/credentials`. Local `<cwd>/.git/` is **allowed** so a skill committing into its working repo still works.
- **Outbound network** (any `WebFetch` / `WebSearch` / host-carrying `Bash` command): deny-by-default except `*.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, `github.com`, `pypi.org`, `registry.npmjs.org`.
- **Mid-run package installs** (any `Bash` command matching): `pip install`, `pip3 install`, `npm install`, `yarn add`, `pnpm add`, `curl ... | sh`, `wget ... | sh`.
- **API-key-sniffing commands** (any `Bash` command reading secret env vars): `printenv AWS_*`, `echo $ANTHROPIC_API_KEY`, `env | grep OPENAI_*`, etc.

*Cites: `[FILE DENY]`, `[NET DENY]`, `[BASH DENY]`, `[GIT POLICY]`, `[PAINKILLER — env-var read detection]`.*

When the hook fires a block, it exits 2 with a formatted stderr message:

```
BLOCKED: READ /Users/shiva/.ssh/id_rsa — to allow, run: npx skills-watch allow add /Users/shiva/.ssh/id_rsa
```

Claude Code feeds this stderr to Claude as an error. Claude relays it to the user in natural language, including the override command.

*Cites: `[CLARITY — actionable BLOCKED]`, `[PAINKILLER — block-on-use]`.*

---

## Escape hatch — a persistent allow-list, managed by CLI

When a skill legitimately needs something on the deny-list, the user runs a one-line command:

```
npx skills-watch allow add ~/.gitconfig
npx skills-watch allow add-host api.mysite.com
npx skills-watch allow list
npx skills-watch allow remove ~/.gitconfig
```

The allow-list is stored at `~/.skills-watch/config.json` and read by the hook on every invocation. No env-var-propagation dependency (investigated and rejected as too fragile). The trade-off: allow-list persists across sessions (users who grant `~/.gitconfig` once need to remember to remove it later if they want strict default again), but reliability wins. Scope is always user-wide — no per-skill or per-session granularity in v0.

When the hook blocks a tool call, the BLOCKED stderr message names the exact `npx skills-watch allow add …` command the user can run to unblock — one copy-paste from a "no" to a "yes".

*Cites: `[ESCAPE HATCH]`.*

---

## Summary

```
npx skills-watch summary [--since <duration>]
```

Reads `~/.skills-watch/live.log`, prints `SUMMARY: N tool calls, K BLOCKED (since <iso8601>)`. Default window is "since last SessionStart event"; `--since 1h` / `30m` / `2d` windows by duration. Implemented as a log post-processor because Claude Code's hook API has no `SessionEnd` event.

*Cites: `[CLARITY — summary CLI]`.*

---

## Out of scope for v0

- **Cursor, Codex, Cline, Gemini CLI.** Those agents have their own hook / tool-call systems; Claude Code is the Wedge-1 target. Cross-agent adaptation is a v1 path per `spikes/niche_expansion.md`.
- **Kernel-level enforcement.** The hook is pattern-matching at the tool-call boundary, not a sandbox. A skill that base64-encodes a malicious command could still slip through the Bash-pattern check. v1 plans to add SRT subprocess wrapping as a second layer for kernel-enforced isolation.
- **Per-skill persisted allow-lists.** The allow-list is user-wide. Per-skill trust levels are v1 territory.
- **Team-shared allow-lists.** v1+.
- **Windows.** Claude Code itself is macOS + Linux; skills-watch inherits that.

---

## Evidence (spikes)

Every competitor / substrate / user-research claim above is grounded in a committed spike under `tango/2026-04-18_mvp-shape/spikes/`:

- `competitor_nono.md` — NoNo is a Landlock/Seatbelt runtime with sigstore attestation and an announced "skill + policy registry." We complement rather than compete; our wedge is zero-config observability.
- `competitor_socket_dev.md` — Socket.dev prices at $25–50/dev/mo (our Team tier anchor below that, ≤$10/dev/mo).
- `competitor_stepsecurity.md` — StepSecurity's `harden-runner` is the architectural twin for CI; their "Dev Machine Guard" laptop page 404s. Strongest "why now" signal.
- `competitor_skills_sh_audits.md` — skills.sh `/audits` aggregates static verdicts; leaves the runtime tier open.
- `icp.md` — solo devs using Claude Code who install community skills and lack visibility into what those skills do.
- `niche_expansion.md` — three expansion directions (cross-harness, team policy, CI) and three kill-cases (Anthropic bakes it in; NoNo ships registry; fear doesn't materialize).
- `substrate_srt.md` — SRT's limits, informing what the v0 hook-pattern-match approach can and cannot promise.
