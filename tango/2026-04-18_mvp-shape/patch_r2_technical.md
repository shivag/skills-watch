# Round 2 Patch Proposal — arena.md `# Technical` section

**Target section:** `# Technical` in arena.md (currently a stub).
**Rubric items addressed:** all 9 Technical-rubric items; defends `C2.1 (dep: SRT)`, `C2.2 (dep: skills.sh focus)`, `C3.2 (biz: time-to-ship)`.
**Spike needed?** No new quantitative claims in this patch; the latency and red-team numbers are rubric-sourced. Phase 2 requires three verification spikes (enumerated inline) but those are committed when implementation starts, not as part of this patch.

---

## Proposed new `# Technical` body

### Architecture at a glance
skills-watch is a ~500-line TypeScript CLI that wraps [SRT](https://github.com/anthropic-experimental/sandbox-runtime). On invocation, it computes an SRT settings object from the universal deny-list and any `--allow` flags, delegates execution to `SandboxManager.wrapWithSandbox(...)`, tails SRT's event stream, formats each event as `[ACTION] [OBJECT]`, and emits a summary on exit. SRT is the sole enforcement backend for v0 [`Technical: SRT as sole backend`]. No separate daemon, no state, no config file.

### Language + distribution
**TypeScript, published as an npm package, invoked via `npx skills-watch`.** SRT is TypeScript (`@anthropic-ai/sandbox-runtime`), so direct library import gives zero IPC cost; users who already have Node for `npx skills add` need no additional runtime [`Technical: npx distribution`]. A Python or shell-wrapper alternative was rejected as simpler-in-appearance-only: shell can't produce the structured live format, and Python adds a second runtime prerequisite that violates the friction floor. This is the simpler-more-powerful choice, not the fancier one.

### Component breakdown (5 modules, ~500 LOC total)

| Module | What it does | LOC target |
|---|---|---|
| `bin/skills-watch` | Parse CLI args (`--allow`, `--allow-host`, skill source); resolve skill via `skills` package API; stage skill files into a temp CWD; invoke the runner. | ~80 |
| `src/policy.ts` | Compile SRT settings JSON from the universal deny-list + `--allow`/`--allow-host` flags + env-var scrub list. Pure function, fully unit-testable. | ~120 |
| `src/runner.ts` | Call `SandboxManager.initialize(policy)`; invoke `wrapWithSandbox(skillCommand)`; subscribe to SRT's event emitter. | ~80 |
| `src/formatter.ts` | Map each SRT event → one `[ACTION] [OBJECT]` line; colorize BLOCKED lines red; maintain running counters for the summary. | ~120 |
| `src/summary.ts` | On process exit, print the `SUMMARY:` line; determine exit code (0 if no blocks, non-zero otherwise); emit one-time stdin-EOF notice on first run (state lives in `~/.skills-watch/firstrun`). | ~80 |

Everything else (error messages, usage strings, tests) rounds up to ~500 LOC total — shippable inside the 14-day time-to-user floor [`C3.2`].

### Universal policy shape
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

(Targets mid-run supply-chain vectors; the skill itself already runs under `npx`, so the top-level `npx skills-watch` invocation is outside the sandbox.)

### Flow: what happens when the user runs `npx skills-watch <skill>`

1. CLI parses args. If `--allow` / `--allow-host` provided, subtract those entries from the default deny-lists.
2. `policy.ts` emits a JSON blob that matches SRT's settings schema.
3. `skills` library API resolves `<owner>/<repo>` to a local SKILL.md + any bundled scripts, staged into a temp dir chosen as the skill's CWD.
4. `runner.ts` calls `SandboxManager.initialize(policy)` then `wrapWithSandbox(skillInvocation)`.
5. As the skill runs, SRT emits filesystem / network / process events on an event emitter. `formatter.ts` subscribes, maps each to `[ACTION] [OBJECT]`, colors BLOCKED lines red, writes to stdout.
6. On exit, `summary.ts` prints the summary line, flushes state, returns `0` or non-zero.

### Verification spikes (required before Phase 2 converge)
- `spikes/redteam_secrets.py` — runs the 7 red-team attacks inside a skills-watch invocation; asserts each produces a BLOCKED verdict, the skill process terminates, and exit code is non-zero.
- `spikes/perf_cold_prime.py` — measures wall-clock from `npx skills-watch <trivial-skill>` to first stdout line on a cleaned npm cache with a 50 Mbps network-rate cap; asserts ≤ 10s.
- `spikes/perf_warm.py` — same measurement with npm cache populated; asserts ≤ 1s.

### Known limits (inherited from SRT)
- **No syscall-level filtering.** SRT uses `sandbox-exec` / `bubblewrap` + network proxy; we cannot detect or block e.g. arbitrary `ptrace` or memory-mapping behavior. If a skill exploits a sandbox escape in the substrate, we lose. Acceptable at v0 [`C2.1`]; a future `--backend=nono` backend (Level 2) gives a Landlock upgrade path for users who want tighter isolation.
- **No CPU / memory limits.** A runaway skill can still eat resources. Out of scope for v0 — we're a *security* belt, not a *resource* belt.
- **macOS + Linux only.** Windows users cannot run skills-watch in v0 [`C2.1`, `Product: Out of scope`].

### Out of scope for v0 (consistent with Product section)
- Interactive skills (stdin → EOF with one-time notice).
- Per-skill persisted allow-lists (flags are per-run only; persistence is v1 territory).
- Team policy server, cross-harness wrapping, CI integration (v1+ expansion paths per `spikes/niche_expansion.md`).
