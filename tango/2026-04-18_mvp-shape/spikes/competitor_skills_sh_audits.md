# Competitor teardown: skills.sh /audits

**URL:** https://skills.sh/audits

## What it is (two sentences)
A single aggregation table on the skills.sh registry that shows, per published skill, the verdicts of three third-party scanners: **Gen Agent Trust Hub**, **Socket**, and **Snyk**. Columns: Gen verdict (e.g., "Safe" / "High Risk"), Socket alert count, Snyk risk tier.

## How it works
- Fully automated aggregation of three external scanners.
- Not community-submitted. Not professional pen-tests. No written audit narratives.
- **No cadence advertised. No pricing. No public API or feed documented on the page.**
- Pure trust layer for the registry — not monetized.

## Weaknesses as a defender's tool
- **Static-only.** Inherits the static-only posture of every underlying scanner. A skill that *looks* clean in AST and phones home at runtime is rated "Safe" here.
- **Coarse verdicts.** Safe / Low / Med / High / Critical. Inconsistent across scanners — e.g., `azure-prepare` is "Safe" per Gen Agent Trust Hub but "Critical" per Snyk.
- **No runtime signal.** Zero observability into what a skill did when it actually ran.
- **No per-install telemetry.** Users cannot see install volumes, complaints, revocations.
- **No allow-list export.** Audits verdicts are not machine-readable to downstream tools.

## Relevance to skills-watch
- **Strongly validates the category.** The registry itself is signaling that security-of-skills is a buyer concern worth putting on the nav bar.
- **Leaves the runtime tier wide open.** Every audit is static; no one is watching what a skill does at execution on a developer's laptop.
- **Distribution channel, not competitor.** Skills-watch can *consume* `/audits` verdicts as a pre-execution reputation input (we can scrape the table until they ship an API) and sell the missing runtime layer.
- **Possible partnership.** skills.sh has no native runtime story — we could be their runtime story. Worth reaching out once v0 ships with a real demo.

## What a user would need to leave /audits for skills-watch
Nothing to leave — /audits is a badge on the registry, not a tool users run. Skills-watch is a tool users run. We consume /audits signal; we don't replace it.

## Strategic note
If skills.sh ever ships their own runtime sandbox feature, we'd be in direct competition. Today they've chosen to stay at the static-aggregation layer. No indication that changes in the near term. Worth monitoring.
