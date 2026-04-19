# ELI12

**skills-watch v0.3** is about getting the tool into real developers' hands, not about adding more enforcement depth. After v0.1 (install) and v0.2 (risk-aware blocks), the tool is polished — it just isn't on npm yet, and nobody knows what it does for their actual skills. v0.3 ships three things, all of which are "reads over existing data" rather than new enforcement code: (1) actually publish to npm and do the launch sequence (HN Show + `awesome-agent-skills` PR + compat-matrix threat-research post) — this fixes the 404-on-`npx`-install problem; (2) a new `npx skills-watch risk` subcommand that summarizes what the guard has done without requiring users to tail a log file in a second terminal; (3) `docs/compatibility.md` — an empirical matrix of what each of the top 10 skills.sh skills does under the hook, with ≥5 rows VERIFIED against live output. Total code delta ≈80 LOC; total doc delta ~200 lines; content drafts for HN / awesome-agent-skills / threat-research live in `drafts/`.

The v0.3 goal: at least one timestamped non-author artifact (tweet / HN comment / issue / install ping) within 7 days of `npm publish`. If zero, we stop and reassess positioning — not build more.

# Product
*(Populated during Phase 1 rounds; each claim rubric-traced.)*

# Technical
*(Populated during Phase 1 rounds; each claim rubric-traced.)*

# ELI12 Changelog

| Version | After Round | What's new since previous | Why it changed |
|---|---|---|---|
| v0 | bootstrap | Initial v0.3 ELI12. | Session start. |
