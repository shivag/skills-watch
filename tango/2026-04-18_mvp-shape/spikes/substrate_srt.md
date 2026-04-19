# Substrate teardown: SRT (Sandbox RunTime)

**NOTE:** SRT is not a competitor — it is the chosen substrate. This teardown establishes its capabilities and limits so the skills-watch rubric can be grounded against what SRT actually exposes, not what we wish it did.

**Repo:** https://github.com/anthropic-experimental/sandbox-runtime
**npm:** `@anthropic-ai/sandbox-runtime`
**CLI binary:** `srt`
**Stars:** ~3,818 (as of 2026-04-18)
**License:** Apache-2.0
**Language:** TypeScript
**Status:** "Beta Research Preview" from anthropic-experimental; built for Claude Code; pushed 2026-04-03

## Mechanism (per README)
- **macOS**: `sandbox-exec` with dynamically generated Seatbelt profiles.
- **Linux**: `bubblewrap` with network namespace removal; all outbound traffic forced through Unix-socket-bind-mounted local proxies.
- **Network enforcement**: local HTTP and SOCKS5 proxies enforce domain allow/deny lists. macOS pins to a localhost port; Linux uses Unix sockets.
- **Not used**: seccomp, landlock, Docker. This matters — no syscall-level filtering, so SRT cannot detect/block e.g. arbitrary process-manipulation syscalls. Filesystem and network are the primary lever.

## Permission model (`~/.srt-settings.json`)
- `filesystem.allowRead` / `denyRead` — **deny-then-allow** (read allowed by default, deny-list applies).
- `filesystem.allowWrite` / `denyWrite` — **allow-only** (write denied by default, allow-list applies).
- `network.allowedDomains` / `deniedDomains` — **allow-only** (network denied by default).
- Unix-socket restrictions; macOS violation-log tapping available for observability.
- **No documented** env-var scrubbing or fork/exec capability bits. Env vars pass through untouched.

## Invocation surface (both CLI and library)
CLI:
```bash
srt "curl anthropic.com"
srt --settings /path/to/srt-settings.json npm install
```

Library (TypeScript):
```ts
import { SandboxManager } from '@anthropic-ai/sandbox-runtime'
await SandboxManager.initialize(config)
const cmd = await SandboxManager.wrapWithSandbox('curl https://example.com')
```

README highlights MCP-server wrapping as a flagship use case — Anthropic is signaling they *want* downstream tools building on top.

## Implications for skills-watch v0
1. **Universal deny-list maps cleanly onto SRT config.** Our hardcoded deny of `~/.ssh/`, `~/.aws/credentials`, `~/.gnupg/`, etc. becomes `denyRead` entries. Mid-run installs (pip/npm/curl|sh) are blocked via process path allow-lists.
2. **Network allow-list is also a clean SRT primitive.** Default allow set (skill's own referenced hosts + model APIs + dev infra) becomes `allowedDomains`.
3. **Observability is a gap.** SRT enforces and logs, but there's no pretty live-stream of "what the skill is trying to do." Skills-watch needs to build a tail-and-format layer on top.
4. **Env-var scrubbing is a gap.** SRT passes env vars through. Skills-watch v0 must strip or mask sensitive env vars (AWS_*, ANTHROPIC_API_KEY, etc.) BEFORE handing control to SRT.
5. **macOS + Linux only.** No Windows story from SRT. Skills-watch inherits this limit; defer Windows to v2.

## Dependency floor
- `(dep: SRT)` — skills-watch cannot enforce syscall-level behavior beyond what SRT exposes. If a skill exploits a sandbox escape in sandbox-exec or bubblewrap, we lose. This is a known limit.
- `(dep: macOS + Linux)` — no BSD, no Windows.

## Why this matters for the rubric
Every Technical-rubric item about "skills-watch blocks X" is really "SRT can block X AND our universal deny-list configures it to." Any item implying syscall-level filtering requires a different backend (NoNo via Landlock, or future SRT extension). Don't write rubric items that SRT can't satisfy.
