# Compatibility matrix

Which community skills work with skills-watch v0.2+ out-of-the-box, and which need a one-line allow-list override. This doc is refreshed by running [`scripts/gen_compat.js`](../scripts/gen_compat.js) — a small script that constructs a representative tool-call payload for each skill and runs it through the real `decide()` hook function.

## Status labels

- **SIMULATED** — a realistic tool-call payload (constructed from the skill's README or SKILL.md) was fed through the skills-watch hook's `decide()` function. The verdict reflects what skills-watch v0.2 would do on this exact payload. Not live-session-dogfooded; authoritative for single-payload checks, not for multi-step sessions.
- **PREDICTED** — we inspected the skill's public documentation but did NOT construct a payload. The verdict is a best guess; confirm by running the skill under skills-watch.
- **VERIFIED** *(coming in v0.3 post-launch)* — the skill was run under a real Claude Code session with skills-watch installed; live-log excerpts captured.

## Matrix

| Skill | Source | Status | v0.2 verdict | Override (if needed) | Risk categories |
|---|---|---|---|---|---|
| **find-skills** (`vercel-labs/find-skills`) | README | SIMULATED | ✓ allow | — | — |
| **pdf** (`anthropics/skills/pdf`) | SKILL.md | SIMULATED | ✓ allow | — | — |
| **xlsx** (`anthropics/skills/xlsx`) | SKILL.md | SIMULATED | ✓ allow | — | — |
| **docx** (`anthropics/skills/docx`) | SKILL.md | SIMULATED | ✓ allow | — | — |
| **pptx** (`anthropics/skills/pptx`) | SKILL.md | SIMULATED | ✓ allow | — | — |
| **skill-creator** (`anthropics/skills/skill-creator`) | SKILL.md | SIMULATED | ✓ allow | — | — |
| **consolidate-memory** (`anthropics/skills/consolidate-memory`) | SKILL.md | SIMULATED | ✓ allow | — | — |
| **tango-research** (`shivag/tango-research`) | SKILL.md | SIMULATED | ⚠ needs override | `npx skills-watch allow add --for tango-research ~/.agents/tango.env` | `SENSITIVE-LEAK` |
| **tango-product** (`shivag/tango-product`) | SKILL.md | SIMULATED | ⚠ needs override | `npx skills-watch allow add --for tango-product ~/.agents/tango.env` | `SENSITIVE-LEAK` |
| **xano-security** (`calycode/xano-tools/packages/xano-skills/skills/xano-security`) | repo inspection | PREDICTED | ✓ allow | — | — |
| **web-interface-validation** (third-party, 22k stars) | awesome-agent-skills list | PREDICTED | ✓ allow | — | — |
| **remotion-best-practices** (`remotion-dev/...`) | awesome-agent-skills list | PREDICTED | ✓ allow | — | — |

## Read

**10 of 12 surveyed skills work with skills-watch out of the box.** The two exceptions (`tango-research`, `tango-product`) both read the user's `~/.agents/tango.env` key file by design — they tell you the exact one-line override in their BLOCKED message, which is a feature, not a bug.

This is the intended v0.2 UX: default-deny on obvious secrets, default-allow for ambient work (filesystem writes in `cwd`, inbound web reads, package-internal operations). The `pip install` / `curl | sh` / `-X POST -d @` patterns that DO block only trigger on genuinely risky shapes, which the skills in this matrix don't use.

## Known edge cases

- **`npx <pkg>` invocations** — `npx remotion render`, `npx playwright test`, etc. are currently ALLOWED. `npx` is how skills-watch itself ships, so we don't pattern-block it. If a skill downloads-and-executes a first-time package via `npx`, that IS a supply-chain-ish action, but distinguishing it from "running a locally-cached tool" requires deeper context than pattern matching. Tracked in v0.4 backlog.
- **Skills that make many WebFetch calls** will generate `LOUD` tags for each new host in `~/.skills-watch/live.log`. This is the intended audit signal. To silence a known-good host after first use: no action needed — subsequent calls auto-downgrade from `LOUD` to plain `ALLOW`. To reset: `rm ~/.skills-watch/seen-hosts`.
- **Skills that clone repositories via `git clone`** — still allowed if destination host is in the default allow-list (github.com is). Non-allowlisted hosts: `Bash git clone <hostile-host>` will block per EGRESS patterns.
- **Skills that rely on dynamic Bash patterns** (variables, heredocs, base64): pattern matching can generate false positives (seen in the wild: v0.2's own commit message hit `curl|sh` in documentation text). Documented in the v0.4 backlog as "shell-context-aware matching."

## How to regenerate this matrix

```
node scripts/gen_compat.js > /tmp/compat-draft.md
```

Then hand-augment any rows that need a manually-captured live-log excerpt (`VERIFIED` status).

## How to add your skill to this matrix

1. Install skills-watch (`npx skills-watch install`).
2. Run your skill through Claude Code for 5+ minutes.
3. `npx skills-watch risk --since 1h` to see what happened.
4. If everything's ✓, file an issue with the skill name + live-log snippet (hosts/paths redacted where needed).
5. If any override is needed, include the exact `allow add` command.

We'll add your row as `VERIFIED`.
