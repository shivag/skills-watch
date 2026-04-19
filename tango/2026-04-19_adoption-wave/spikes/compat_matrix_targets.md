# Spike: compatibility matrix targets

**Question:** which skills should `docs/compatibility.md` cover for maximum developer value? What does each one likely trigger?

## Top-10 candidates (compiled from Composio, VoltAgent/awesome-agent-skills, virtualuncle.com)

| # | Skill | Likely slug | Install volume | Predicted v0.2 behavior | Likely allow-list ask |
|---|---|---|---|---|---|
| 1 | `find-skills` | `vercel-labs/find-skills` | ~579k | Fetches skills.sh → **ALLOW** (v0.2 rebalance allows any http(s) host by default; `skills.sh` not in deny.hosts). | None — works out of the box. |
| 2 | `frontend-design` | `anthropics/skills` subpath | ~277k | Reads project repo + writes files in cwd → **ALLOW**. | None. |
| 3 | `remotion-best-practices` | `remotion-dev/...` | 117k/wk | Likely benign reads + writes in cwd → **ALLOW**. | None. |
| 4 | `web-interface-validation` | third-party | 133k/wk | May spawn headless browser, write /tmp → **partial BLOCK** (launch-related `Bash` patterns might trip INSTALLER_PATTERNS if it runs `npm install`). | `--for web-interface-validation` allow-list may be needed if the skill does mid-run browser install. |
| 5 | `pdf`, `xlsx`, `docx`, `pptx` | `anthropics/skills` | official | File manipulation in cwd → **ALLOW**. | None. |
| 6 | `skill-creator` | `anthropics/skills` | official | Writes new skills under cwd/`.claude/skills/` → **ALLOW** (inside cwd). | None. |
| 7 | `consolidate-memory` | `anthropics/skills` | official | Reads `~/.claude/` memory files → **BLOCK** on first read attempting `~/.claude/memory.md` or similar (not currently in DENY_PATHS_RAW — actually ALLOW). Need to confirm path used. | Potentially `allow add --for consolidate-memory ~/.claude/memory.md`. |
| 8 | `tango-research` | `shivag/tango-research` | niche | Reads `~/.agents/tango.env` → **BLOCK** (SENSITIVE-LEAK). | `allow add --for tango-research ~/.agents/tango.env`. |
| 9 | `tango-product` | `shivag/tango-product` | niche | Same as tango-research. | `allow add --for tango-product ~/.agents/tango.env`. |
| 10 | `xano-security` | `calycode/xano-tools/packages/xano-skills` | unknown | Performs static security audits — likely reads own repo, no outbound calls → **ALLOW**. | None. |

## What the matrix doc needs to show per row

For each skill, three columns:
1. **What happens out-of-the-box** — green "works immediately" or yellow "one `allow` line away".
2. **The one-line override** (if any) — copy-paste ready.
3. **Why the block happened** — risk category + why that deny rule exists.

## Empirical validation (in addition to prediction)

For each of the 10 skills we CAN clone locally (anthropics/skills, VoltAgent/awesome-agent-skills, tango-research, tango-product), install skills-watch, run a typical skill invocation in Claude Code, capture the live-log output + any BLOCKED messages. Document verbatim.

For skills we can't install (gated, enterprise, etc.), predict from the SKILL.md alone and flag as "predicted, not verified."

## Anti-goals for the matrix doc

- Do NOT publish an exhaustive list of every skill on skills.sh. The 500+/day submission rate (Snyk) makes that unmaintainable.
- Do NOT recommend `allow add` for skills we haven't inspected — blind allows are the thing we're trying to prevent.
- Do NOT go deeper than "what does it need" — risk-scoring / trust-grading is v0.4 territory (if at all; possibly skills.sh's /audits tab will do that).

## Unknown risks

- **Skills that use Claude Code's WebSearch heavily** might generate noise in the LOUD log from first-time hits to search engines. Acceptable trade — users can grep around it. Worth documenting.
- **Skills that invoke Bash with dynamically-constructed commands** (e.g. via heredoc with user-supplied args) may trigger false positives. Document the override pattern.
