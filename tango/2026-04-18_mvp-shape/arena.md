# ELI12

**skills-watch** is a one-command tool that runs any skill from skills.sh under a safety belt. You type `npx skills-watch <owner>/<repo>` — first line of output within 10 seconds on a clean laptop, within a second once it's cached — and while the skill runs you see a live, color-coded stream of every file it reads, every site it connects to, and every program it starts. It blocks the obvious crimes by default: your SSH keys, your AWS creds, your git identity, your shell history, your API-key env vars, any sketchy mid-run `pip install`, and outbound connections to anything outside a tight allow-list of model APIs and core dev infra. When a skill trips the deny-list, it's killed on the spot and the terminal tells you exactly how to re-run with a one-flag override if the action was legitimate. Local `<cwd>/.git/` stays fully usable so skills can still commit into the repo they're working in. Zero config, zero policy-authoring, zero prompts.

The v0 goal: one real outside developer is running this within 14 days of rubric approval.

# Product

## Target user
A solo developer or small dev-tools team who uses at least one AI coding agent that reads community skills — most commonly Claude Code, Cursor, Codex, Cline, or Gemini CLI — and installs third-party skills from **skills.sh** via `npx skills add <owner>/<repo>`. They are a *builder*, not a security engineer. They have hit the "wait, what does this thing actually do on my laptop?" moment at least once and stalled their skill adoption because of it. [Cites: `C1.1 (mkt: skills.sh community)`, `C1.2 (mkt: builder not security-engineer)`, `spikes/icp.md`.]

## The one-command experience
The entire v0 UX is a single command prepended to muscle memory the user already has:

```
npx skills-watch shivag/tango-research
```

On a clean machine, the first line of output appears within **10 seconds** (`LATENCY-PRIME`); on subsequent runs, within **1 second** (`LATENCY-WARM`). No login, no account creation, no config file, no API key prompt — *zero prompts between install and value* [`FRICTION`].

While the skill runs, skills-watch streams one line per observed action:

```
READ   /Users/shiva/.gitconfig
CONNECT github.com:443
EXEC   /usr/local/bin/python3
WRITE  ./tango/2026-04-18_foo/rubric.md
```

Format: `[ACTION] [OBJECT]`, default terminal color for allowed actions, **bright red** for any action that was blocked. Two colors only; no heuristic "unusual" state [`CLARITY color`, `PAINKILLER-1`].

When the skill exits, a single summary line:

```
SUMMARY: 12 file reads, 3 network calls, 1 subprocess. 0 actions blocked.
```

…or, if something got blocked:

```
SUMMARY: 4 file reads, 1 network call. 2 actions BLOCKED.
```

[`CLARITY summary`].

CLI exit code is `0` when no action was blocked, non-zero otherwise — so `skills-watch` composes cleanly into shell pipelines and CI [`Technical: exit code`].

## What skills-watch blocks by default
Without any configuration, a universal deny-list blocks the attacks that almost no legitimate skill needs:

- **Secrets on disk:** `~/.ssh/`, `~/.aws/`, `~/.gnupg/`, `~/.netrc`, `~/.docker/config.json`, `~/.agents/.env`, any stray `.env` outside the current working directory.
- **Shell history:** `~/.zsh_history`, `~/.bash_history` (the most overlooked PII/secret channel).
- **Global git identity & credentials:** `~/.gitconfig`, `~/.git-credentials`, `~/.config/git/credentials`. Local `<cwd>/.git/` stays **readable and writable**, so a skill committing into the repo it's running in still works [`GIT POLICY`].
- **Outbound network:** deny-by-default except `*.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, `github.com`, `pypi.org`, `registry.npmjs.org`.
- **Mid-run package installs:** `pip`, `npm`, `npx`, `curl`, `wget` cannot run inside the sandbox — no supply-chain vector mid-skill.
- **Credential env vars:** `AWS_*`, `ANTHROPIC_*`, `OPENAI_*`, `GEMINI_*`, `GOOGLE_*`, `GITHUB_TOKEN`, `NPM_TOKEN`, `SSH_*` are scrubbed before the skill starts.

When any of these is tripped, the skill process is **terminated immediately** and the event line reads:

```
BLOCKED: READ /Users/shiva/.ssh/id_rsa — to allow this run, rerun with: --allow ~/.ssh/id_rsa
```

[`CLARITY actionable BLOCKED`, `PAINKILLER-2`, `PAINKILLER-3`].

## Escape hatch — one flag, per run
Some legitimate skills need something on the deny-list. For those, the user passes `--allow <path>` (repeatable) or `--allow-host <domain>` (repeatable):

```
npx skills-watch --allow ~/.gitconfig --allow-host api.mysite.com shivag/tango-research
```

No persisted config, no separate file to edit. Flags are explicit and per-invocation so the user sees exactly what they're opening [`ESCAPE HATCH`].

## Out of scope for v0
- **Interactive skills.** stdin is mapped to EOF by default; any skill that reads stdin will see end-of-file immediately. First run emits a one-time notice: `NOTE: interactive skills that require input are not supported in v0.` Interactive skill support is a v1 conversation [`UX-INTERACTIVE`].
- **Windows.** SRT does not support Windows; v0 inherits that limit. macOS + Linux only [`C2.1 (dep: SRT)`].
- **Per-skill persisted allow-lists.** That's NoNo's market. v0 is zero-config; persistence is a v1 demand-driven feature [`C1.2 (mkt: builder not security-engineer)`, `spikes/competitor_nono.md`].

# Technical

## Architecture at a glance
skills-watch is a ~500-line TypeScript CLI that wraps [SRT](https://github.com/anthropic-experimental/sandbox-runtime). On invocation, it computes an SRT settings object from the universal deny-list and any `--allow` flags, delegates execution to `SandboxManager.wrapWithSandbox(...)`, tails SRT's event stream, formats each event as `[ACTION] [OBJECT]`, and emits a summary on exit. SRT is the sole enforcement backend for v0 [`Technical: SRT as sole backend`]. No separate daemon, no state, no config file.

## Language + distribution
**TypeScript, published as an npm package, invoked via `npx skills-watch`.** SRT is TypeScript (`@anthropic-ai/sandbox-runtime`), so direct library import gives zero IPC cost; users who already have Node for `npx skills add` need no additional runtime [`Technical: npx distribution`]. A Python or shell-wrapper alternative was rejected as simpler-in-appearance-only: shell can't produce the structured live format, and Python adds a second runtime prerequisite that violates the friction floor.

## Component breakdown (5 modules, ~500 LOC total)

| Module | What it does | LOC target |
|---|---|---|
| `bin/skills-watch` | Parse CLI args (`--allow`, `--allow-host`, skill source); resolve skill via `skills` package API; stage skill files into a temp CWD; invoke the runner. | ~80 |
| `src/policy.ts` | Compile SRT settings JSON from the universal deny-list + `--allow`/`--allow-host` flags + env-var scrub list. Pure function, fully unit-testable. | ~120 |
| `src/runner.ts` | Call `SandboxManager.initialize(policy)`; invoke `wrapWithSandbox(skillCommand)`; subscribe to SRT's event emitter. | ~80 |
| `src/formatter.ts` | Map each SRT event → one `[ACTION] [OBJECT]` line; colorize BLOCKED lines red; maintain running counters for the summary. | ~120 |
| `src/summary.ts` | On process exit, print the `SUMMARY:` line; determine exit code (0 if no blocks, non-zero otherwise); emit one-time stdin-EOF notice on first run (state lives in `~/.skills-watch/firstrun`). | ~80 |

~500 LOC total is shippable inside the 14-day time-to-user floor [`C3.2`].

## Universal policy shape
Generated fresh for every invocation; not persisted.

**Filesystem — deny-read (global, relative to `$HOME`):**
```
~/.ssh/           ~/.aws/           ~/.gnupg/
~/.netrc          ~/.docker/config.json
~/.agents/.env    ~/.zsh_history    ~/.bash_history
~/.gitconfig      ~/.git-credentials    ~/.config/git/credentials
```

…plus any file matching `.env` anywhere *outside* the skill's CWD. `<cwd>/.git/` is explicitly NOT on the list, so legitimate commits into the current repo work [`GIT POLICY`].

**Filesystem — deny-write (global):** SRT's write-default is already deny. We explicitly allow only the skill's CWD tree.

**Network — deny-by-default. Allow-list:**
```
*.anthropic.com    api.openai.com    generativelanguage.googleapis.com
github.com         pypi.org          registry.npmjs.org
```

**Env-var scrub — unset before sandbox entry:**
```
AWS_*   ANTHROPIC_*   OPENAI_*   GEMINI_*   GOOGLE_*
GITHUB_TOKEN   NPM_TOKEN   SSH_*
```

**Process deny-list — block `exec` of:**
```
pip   pip3   npm   npx   yarn   pnpm   curl   wget
```

Implemented by adding the absolute paths of these binaries (resolved via `which` at startup) to SRT's `filesystem.denyRead` list, which prevents the kernel from loading them for execution. (SRT does not expose a dedicated process-deny primitive in v1; the `filesystem.denyRead` trick is the v0 path, and a dedicated `process.denyExec` is on the Level-2 wishlist.) The top-level `npx skills-watch` invocation runs *outside* the sandbox and is therefore unaffected.

## Flow: what happens when the user runs `npx skills-watch <skill>`

1. CLI parses args. If `--allow` / `--allow-host` provided, subtract those entries from the default deny-lists.
2. `policy.ts` emits a JSON blob that matches SRT's settings schema.
3. `skills` library API resolves `<owner>/<repo>` to a local SKILL.md + any bundled scripts, staged into a temp dir chosen as the skill's CWD.
4. `runner.ts` calls `SandboxManager.initialize(policy)` then `wrapWithSandbox(skillInvocation)`.
5. As the skill runs, SRT emits filesystem / network / process events on an event emitter. `formatter.ts` subscribes, maps each to `[ACTION] [OBJECT]`, colors BLOCKED lines red, writes to stdout.
6. On exit, `summary.ts` prints the summary line, flushes state, returns `0` or non-zero.

## Verification spikes (required before Phase 2 converge)
- `spikes/redteam_secrets.py` — runs the 7 red-team attacks inside a skills-watch invocation; asserts each produces a BLOCKED verdict, the skill process terminates, and exit code is non-zero.
- `spikes/perf_cold_prime.py` — measures wall-clock from `npx skills-watch <trivial-skill>` to first stdout line on a cleaned npm cache with a 50 Mbps network-rate cap; asserts ≤ 10s.
- `spikes/perf_warm.py` — same measurement with npm cache populated; asserts ≤ 1s.

## Known limits (inherited from SRT)
- **No syscall-level filtering.** SRT uses `sandbox-exec` / `bubblewrap` + network proxy; we cannot detect or block e.g. arbitrary `ptrace` or memory-mapping behavior. If a skill exploits a sandbox escape in the substrate, we lose. Acceptable at v0 [`C2.1`]; a future `--backend=nono` backend (Level 2) gives a Landlock upgrade path.
- **No CPU / memory limits.** A runaway skill can still eat resources. Out of scope for v0.
- **macOS + Linux only.** Windows users cannot run skills-watch in v0 [`C2.1`].

## Out of scope for v0 (consistent with Product section)
- Interactive skills (stdin → EOF with one-time notice).
- Per-skill persisted allow-lists (flags are per-run only; persistence is v1 territory).
- Team policy server, cross-harness wrapping, CI integration (v1+ expansion paths per `spikes/niche_expansion.md`).

# ELI12 Changelog

| Version | After Round | What's new since previous | Why it changed |
|---|---|---|---|
| v0 | bootstrap | Initial ELI12 written. | Session start. |
| v1 | R1 (Product ACCEPT) | ELI12 now says *what you type*, *how fast it starts*, *exactly what the deny-list covers*, *what the BLOCKED message looks like*, and *that local `.git/` still works*. Before this, ELI12 only promised "a safety belt" abstractly. | Product section of arena.md is now concrete and rubric-traced; ELI12 had to reflect that the pitch is now demo-ready. |
| v2 | R2 (Technical ACCEPT) | ELI12 unchanged at the user-facing level — Technical details (500 LOC TypeScript, 5 modules, SRT as sole backend) don't change what a 12-year-old would notice. | Technical internals do not belong in ELI12; by design, ELI12 only updates when user-visible behavior changes. |
