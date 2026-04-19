# ELI12

**skills-watch** is a one-command tool that runs any skill from skills.sh under a safety belt. Before the skill runs, skills-watch wraps it in a sandbox (using Anthropic's open-source SRT runtime) and sets up a short, universal deny-list — no reading your SSH keys, no leaking your API keys, no sneaky installs, no writing over your shell config, no dumping your command history. While the skill runs, skills-watch streams a live, readable log of every file it touches, every website it connects to, and every program it starts. When the skill finishes, you get a one-line summary: "N file reads, M network calls, K subprocesses, X blocked." Zero config, zero policy-authoring, works the first time you try it.

The goal for v0: one real outside developer is using this within 14 days of rubric approval.

# Product
*(Populated during Phase 1. Each claim will cite a rubric item and, for quantitative claims, a spike.)*

# Technical
*(Populated during Phase 1. Each claim will cite a rubric item and, for quantitative claims, a spike.)*

# ELI12 Changelog

| Version | After Round | What's new since previous | Why it changed |
|---|---|---|---|
| v0 | bootstrap | Initial ELI12 written. | Session start. |
