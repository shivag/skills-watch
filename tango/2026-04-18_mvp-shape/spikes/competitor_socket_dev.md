# Competitor teardown: Socket.dev

**Homepage:** https://socket.dev
**Pricing:** https://socket.dev/pricing

## What it does (two sentences)
Developer-first supply-chain security for package ecosystems (npm, PyPI, Go, Maven, etc.). Scans dependencies for malware, typosquats, install-script behavior, and CVEs. Their "Socket Firewall" blocks known-malicious packages at install time; the rest is static AST/behavior analysis with marketed "reachability" signal.

## Pricing (the useful comp)
- **Free**: $0 — 1,000 scans/mo, 3 members.
- **Team**: **$25 / dev / mo**.
- **Business**: **$50 / dev / mo**.
- **Enterprise**: custom.

All paid tiers priced **per developer**. This sets a useful **dev-seat ceiling** that skills-watch's team offering must price under (or next to) to be credible.

## Runtime vs static
**Mostly static.** AST + package behavior analysis, metadata heuristics. Socket Firewall is install-time interception — it blocks `npm install` of flagged packages — *not* process-execution runtime. No visibility into what a package does *after* install.

## ICP
Mid-market engineering orgs; AppSec / platform teams who want SCA their devs don't actively hate. Free tier courts OSS individuals and converts to paid at team size.

## Where they're weak (complaint themes)
- Reachability analysis has over-promised historically; false-positives on transitive deps remain a repeated complaint on HN threads about SCA generally.
- Static-only — a package that looks clean but phones home at runtime is invisible to Socket.
- Package-ecosystem-scoped (npm / PyPI / Go). **No "skill-level" or agent-aware concept.**

## Why they matter for skills-watch
- **Adjacent, not overlapping.** Socket stops known-bad *packages* at install; skills-watch stops unknown-behavior *skills* at runtime. Different noun, different moment.
- **Skills.sh /audits already consumes Socket signal** (see `competitor_skills_sh_audits.md`). That's a distribution channel, not competition.
- **Pricing anchor**: if we charge, Team tier probably lands in the $10–20/dev/mo range — below Socket's $25 to look like a focused value tool, above $0 to signal we're real infrastructure.

## What a user would need to leave Socket for us
Nothing — they complement. A team could run Socket for npm hygiene AND skills-watch for skill runtime. We should explicitly position as "the runtime layer Socket doesn't do."
