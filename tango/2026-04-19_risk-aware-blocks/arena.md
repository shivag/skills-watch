# ELI12

**skills-watch v0.2** makes the guard smarter about what's actually dangerous vs. what just looks scary. In v0.1, every outbound network call that isn't on our tight allow-list gets blocked — even if the agent is just reading a docs page. That's noisy, and pushes users to either over-allow-list (weakening the guard) or disable the tool (losing the guard entirely). In v0.2 we split the difference: pulling data (docs, API reads, benign `curl`s to any host) is ALLOW-and-log; exfil patterns (`-X POST -d @secrets`, `curl | sh`, `wget > file && chmod +x`, mid-run package installs) still BLOCK. When something does block, Claude now tells you in plain English *why* — the risk category, a one-line "here's why this is usually bad," a one-line "here's when it might actually be fine for your case," and the exact scoped command to allow it. Five risk categories; copy lives in a committed JSON file so tightening it doesn't touch code.

The v0.2 goal: tagged and in a real outside developer's hands within 7 calendar days of rubric approval.

# Product
*(Populated during Phase 1 rounds; each claim rubric-traced.)*

# Technical
*(Populated during Phase 1 rounds; each claim rubric-traced.)*

# ELI12 Changelog

| Version | After Round | What's new since previous | Why it changed |
|---|---|---|---|
| v0 | bootstrap | Initial v0.2 ELI12. | Session start. |
