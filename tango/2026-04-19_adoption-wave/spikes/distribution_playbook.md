# Spike: distribution playbook prior art + launch timing

## Prior art — how similar tools got their first 100 users

### harden-runner (StepSecurity) — the closest analog
- [Show HN Mar 2022](https://news.ycombinator.com/item?id=30504205) — tied to a free community tier and "EDR for GitHub Actions runners" framing.
- [3 years to 10k open-source repos](https://www.stepsecurity.io/blog/10-000-open-source-projects-now-secured-by-harden-runner-community-tier-a-milestone-three-years-in-the-making) — growth was slow and community-driven.
- First wave came from **open-source maintainers**, not enterprise buyers.

**Transplant to skills-watch:** frame as *"harden-runner for Claude Code agent skills."* Same shape (runtime enforcement via hook-style integration), different host, different threat population.

### Socket.dev
- [Show HN 2022](https://news.ycombinator.com/item?id=30515090) + `alias npm="socket npm"` muscle-memory hook was the inflection.
- Continuous threat-research blog kept mindshare.

**Transplant:** skills-watch's muscle-memory hook is *the agent invocation itself* — user types `/foo` in Claude Code and the guard fires without any per-call command. That is inherently the socket.dev-style invisible-friction play; once adopted it stays invoked forever.

### anthropic-experimental/sandbox-runtime (SRT)
- [HN post Oct 2025 id=45647669](https://news.ycombinator.com/item?id=45647669) — quiet GitHub drop, no marketing push, organic growth.
- Relevant because Anthropic's own backing of SRT sets a *credibility floor* — our downstream tool builds on top of the substrate they've publicly blessed.

## Fresh incident data since Feb 2026 (launch-post ammunition)

- **CVE-2025-59536** (CVSS 8.7) — Claude Code RCE via hooks / MCP / env in project configs. Source: [Check Point](https://research.checkpoint.com/2026/rce-and-api-token-exfiltration-through-claude-code-project-files-cve-2025-59536/), [SecurityWeek](https://www.securityweek.com/critical-vulnerability-in-claude-code-emerges-days-after-source-leak/).
- **CVE-2026-21852** — API-key exfil through project files.
- **March 2026 Claude Code source leak** — 512k LOC on npm; trojanized forks appeared. Source: [Zscaler](https://www.zscaler.com/blogs/security-research/anthropic-claude-code-leak), [Coder](https://coder.com/blog/what-the-claude-code-leak-tells-us-about-supply-chain-security).
- **VirusTotal OpenClaw** launched as a static-scanner competitor. Skills-watch differentiates as *runtime* enforcement, not signature scan.
- **Snyk** daily-submission growth: skill submissions went from <50/day → 500+/day in weeks. Market is heating fast.

## Recommended launch sequence — Day 0 to Day 7

**Day 0** (tag cut + `npm publish`): land v0.2.0 on npm. Wait a few hours for the package to propagate; verify `npx skills-watch install` works on a clean machine.

**Day 1 — Show HN post**: title exactly *"Show HN: skills-watch — runtime security for Claude Code agent skills"*. Body opens with CVE-2025-59536, references ToxicSkills 13.4%, links to README + demo command. Post Tuesday–Thursday morning PT. Pin the HN post URL in `README.md` for the week.

**Day 2 — skills.sh community touchpoints**: skills.sh itself has no public community channel per research. Substitutes:
1. GitHub Discussions on `anthropics/skills` — "Runtime guard for `/<skill-name>` tool calls"
2. Pull request on `VoltAgent/awesome-agent-skills` adding a "Security" category with skills-watch as the inaugural entry.
3. Issue on `vercel-labs/skills` (issue #248 requested a skill-security-auditor — landing there is context-appropriate).

**Day 3 — Threat-research blog post**: map the compatibility matrix to Snyk's 534 critical-risk skills. Show that v0.2 would have blocked the most common ToxicSkills exfil patterns by default. Post on `shivag.dev` or equivalent; cross-link from HN + README.

**Day 4 — Twitter thread**: *"I ran skills-watch against the top 10 skills.sh skills. Here's what each one tried to do."* Screenshots of the 4-line risk template. Thread wraps with install one-liner.

**Day 5–7** — monitor issues / discussions / DMs. Every real false-positive goes into the v0.4 backlog, every real allow-list request goes into curated per-skill profiles (future v0.4).

## Measurable success (Business rubric)

- **Primary:** ≥10 unique non-author `npx skills-watch install` events within 7 days of npm publish. (Measurable via opt-in install telemetry — not yet built; proxy measurement = npm download count.)
- **Secondary:** Show HN post reaches ≥50 HN points OR ≥200 npm weekly downloads.
- **Tertiary:** at least 1 public "I use skills-watch" artifact from a non-author (tweet / issue / README badge).
