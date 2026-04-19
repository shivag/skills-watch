# Niche expansion: skills-watch

## The narrow niche we start from

**Solo / small-team developers running Claude Code (or Cursor/Codex/Cline) who install skills from skills.sh and want security without policy authoring.**

Market size signals:
- SRT has ~3,818 stars; NoNo has ~2,009. Suggests an interested population in the low thousands at minimum for agent sandboxing generally.
- Skills.sh itself indexes public GitHub repos — exact install counts aren't public, but the `/audits` tab's existence confirms the registry itself sees security as a category buyers want.
- Claude Code has a rapidly growing user base (Anthropic's engineering blog on sandboxing linked directly from SRT's README signals this is an active internal concern).

This niche is small today but growing monotonically as (a) more people use AI coding agents, (b) more skills get published to skills.sh, (c) the first real exfiltration incident hits twitter and makes "hardening" non-optional.

## If we win the niche, what unlocks next?

Three adjacent niches visible from here, in order of strategic adjacency:

### 1. Cross-harness portability (nearest)
Today skills-watch wraps skill execution on a developer's laptop. The *same* universal deny-list + observability pattern applies to ANY agent-invoked tool — not just skills.sh-registered ones. Natural v1 expansion: "skills-watch any agent command," not just skills. That doubles the TAM by pulling in Cursor-rule users, Cline agent-invocations, custom scripts fed to Claude Code.

### 2. Team policy server (mid)
Once solo devs have skills-watch installed, their employers will ask "can we enforce this team-wide?" A hosted (or self-hosted) policy server that pushes allow-lists and deny-lists to every dev's laptop is the enterprise-adjacent next step. This is where dollar ARPU starts to show up — the solo tool is free or $5/mo, the team server is $20–50/user/mo.

### 3. CI + pre-deploy integration (far)
StepSecurity (see competitor teardown) has proved that "hard-deny unexpected egress during job execution" works in CI. Skills-watch's runtime deny-list can plausibly port to CI to guard against supply-chain attacks from skills used by agentic CI jobs. This is where we start touching real CISO budgets.

## What would break if the niche is a dead end?

Three kill-cases, prioritized:

### Kill-case A (most likely): Anthropic bakes this into Claude Code directly
If Claude Code ships default sandboxing that wraps every skill invocation with SRT and a sensible deny-list, the reason-to-exist for skills-watch evaporates for Claude Code users. We'd need to retreat to non-Anthropic agents (Cursor, Codex, Gemini CLI, Cline) where skill security is still unaddressed. **Mitigation:** track Anthropic's Claude Code roadmap closely; if they telegraph this feature, pivot fast to cross-agent positioning or composition (v1 niche).

### Kill-case B: NoNo ships their "skill and policy registry" fast
If NoNo's announced skill/policy registry materializes before we have traction, they own the noun "skill security" in the market. **Mitigation:** ship v0 fast (days, not months) and seed the community policy library so we win on "default-safe policies for the top N skills." Their Rust barrier-to-contribution works in our favor here.

### Kill-case C: The fear doesn't materialize
If no major exfil incident happens and the skills.sh community stays vibe-based-trust, demand for a sandbox wrapper stays niche and we cap out at the OSS enthusiast tier. **Mitigation:** this one we can't fully hedge — if nobody ever gets burned, the product is an insurance policy nobody buys. But the trajectory of LLM tool proliferation makes this unlikely.

## Niche-first bias for v0

Build for the small monotonically-growing niche that has the pain today. Do not optimize for Kill-case B's "registry" competition or the CI expansion yet. v0 is one command prepended to `npx skills add` muscle memory — anything else is a future-proofing vitamin.
