# Round 1 Patch Proposal — arena.md `# Product` section

**Target section:** `# Product` in arena.md (currently a stub).
**Rubric items addressed:** all 6 Product-rubric items + C1.1, C1.2, C4 guiding principles.
**Spike needed?** No — all quantitative claims are rubric-sourced, not new.

---

## Proposed new `# Product` body

### Target user
A solo developer or small dev-tools team who uses at least one AI coding agent that reads community skills — most commonly Claude Code, Cursor, Codex, Cline, or Gemini CLI — and installs third-party skills from **skills.sh** via `npx skills add <owner>/<repo>`. They are a *builder*, not a security engineer. They have hit the "wait, what does this thing actually do on my laptop?" moment at least once and stalled their skill adoption because of it. [Cites: `C1.1 (mkt: skills.sh community)`, `C1.2 (mkt: builder not security-engineer)`, `spikes/icp.md`.]

### The one-command experience
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

### What skills-watch blocks by default
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

### Escape hatch — one flag, per run
Some legitimate skills need something on the deny-list. For those, the user passes `--allow <path>` (repeatable) or `--allow-host <domain>` (repeatable):

```
npx skills-watch --allow ~/.gitconfig --allow-host api.mysite.com shivag/tango-research
```

No persisted config, no separate file to edit. Flags are explicit and per-invocation so the user sees exactly what they're opening [`ESCAPE HATCH`].

### Out of scope for v0
- **Interactive skills.** stdin is mapped to EOF by default; any skill that reads stdin will see end-of-file immediately. First run emits a one-time notice: `NOTE: interactive skills that require input are not supported in v0.` Interactive skill support is a v1 conversation [`UX-INTERACTIVE`].
- **Windows.** SRT does not support Windows; v0 inherits that limit. macOS + Linux only [`C2.1 (dep: SRT)`].
- **Per-skill persisted allow-lists.** That's NoNo's market. v0 is zero-config; persistence is a v1 demand-driven feature [`C1.2 (mkt: builder not security-engineer)`, `spikes/competitor_nono.md`].
