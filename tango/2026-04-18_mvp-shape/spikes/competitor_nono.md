# Competitor teardown: NoNo

**Repo:** https://github.com/always-further/nono
**Homepage:** https://nono.sh
**Stars:** ~2,009 (as of 2026-04-18)
**License:** Apache-2.0
**Language:** Rust (core) + Python/TS/Go bindings (`nono-py`, `nono-ts`, `nono-go`)
**Last push:** 2026-04-18 — actively maintained by `always-further` org

## What it is (one sentence)
A capability-based, multiplexing sandbox tool for AI coding agents — wraps command execution with Landlock (Linux) and Seatbelt (macOS), plus sigstore-based attestation of SKILL.md / CLAUDE.md files and proxy-based credential injection.

## Who uses it
Built-in profiles shipped for Claude Code, Codex, OpenCode. Positioned at the "agent harness hardening" tier — intended for users who already run one of these agents and want to harden their runtime.

## Pricing
Unclear from the repo; appears OSS with an unannounced commercial offering. Homepage is nono.sh.

## Where they're strong
- Runtime enforcement that actually denies bad actions, not just observes.
- Sigstore attestation of skill files is forward-looking; it's the signed-artifact layer we'd otherwise have to build.
- Multi-language bindings mean the core is usable from Python/TS/Go (reduces friction for downstream integrators).
- Snapshotting lets you restore a known-clean state after a sketchy skill run.
- **Announced roadmap item: "skill and policy registry"** — this is direct territory overlap and the single biggest strategic risk for skills-watch.

## Where they're weak (what skills-watch does differently)
1. **Policy authoring is still manual.** NoNo gives you the runtime; it does NOT automatically derive "what this skill needs" from a SKILL.md. Users have to author profiles. That's the friction point skills-watch targets (universal deny-list, zero authoring).
2. **Primarily enforcement-oriented, not observability-oriented.** The "what did this skill try to do" report isn't the marketed surface. Skills-watch inverts: observability is the main product, enforcement is a tight universal deny-list.
3. **Targets agent harnesses, not skills specifically.** NoNo wraps Claude Code / Codex / OpenCode as a whole; skills-watch wraps an individual skill invocation. Different noun.
4. **Rust core barrier to contribution.** Python/TS/Go bindings help, but community policy library contributions will be easier around a Python/TS tool built on top.

## Why they matter for us
NoNo is the strongest substrate competitor. The realistic posture is **complement, not compete**: skills-watch can run atop NoNo as an alternative backend (for users who want Landlock-grade isolation), while defaulting to SRT (Anthropic's substrate — more likely to become "the default").

Watch-list: if NoNo ships their "skill and policy registry," we either integrate with it or accept faster obsolescence.

## What a user needs to leave them for us
A user already running NoNo for agent hardening probably stays on NoNo for that. Skills-watch's wedge is the user who has NOT yet set up NoNo and wants security on a per-skill basis with zero policy authoring. Different entry point.
