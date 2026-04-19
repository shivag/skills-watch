# Debate Log — skills-watch v0.3 adoption-wave session 2026-04-19

## Origin

User asked "Can you tango-product the v0.3? Does it make it simpler? Does it add more value to the developer?" — applying the antibiotic-lens check to the v0.3 backlog as drafted at v0.2 ship time.

## Pre-R1 scope flip

Under antibiotic-lens review, the original v0.3 backlog (shell-context-aware pattern matching, PROMPT-INJECT detection, obfuscated Bash detection, per-host POST allow) was judged mostly vitamin:
- Shell-context matching fixes a rare false-positive with high build cost (Bash tokenizer).
- PROMPT-INJECT is painkiller-shaped but technically risky.
- Obfuscated Bash is theoretical without real-world incident evidence.
- Per-host POST allow is niche.

Counter-proposed "adoption wave" v0.3 (approved by user): npm publish + distribution, `skills-watch risk` dashboard, empirical `docs/compatibility.md`. All three are antibiotics for the adoption gap, not enforcement gap. Original v0.3 items logged in rubric.md Defeated Rubrics block, to be reprioritized based on real user feedback from the adoption wave.

## Phase 0 spikes (2)

- `distribution_playbook.md` — harden-runner / Socket.dev / SRT launch prior art; fresh CVE ammunition (CVE-2025-59536 CVSS 8.7, CVE-2026-21852, March 2026 Claude Code source leak, ToxicSkills 13.4% + 500/day growth rate); day-0-to-day-7 launch sequence.
- `compat_matrix_targets.md` — top 10 skills.sh skills with predicted v0.2 behavior + override needs; empirical-verification plan.

## Round R1 — Gemini ACCEPT (`gemini_r1_raw.md`)

Clean ACCEPT with no surgical fixes. Selected observations:

> "The strategic pivot from feature depth to distribution breadth is precisely the right move for a v0.3 product trying to cross the adoption chasm."

> "Killing the original v0.3 backlog was a sign of product maturity."

> "C6.1 (no new enforcement) is the perfect guardrail to prevent a relapse into feature-building."

On the ≥1-non-author-artifact metric: *"It is the perfect metric for this specific stage. For a nascent open-source tool, getting a single unsolicited, public signal from a stranger is a massive milestone."*

Only risk flagged: time-to-user execution quality. 5-day timeline is tight for content creation (HN post, threat-research blog). Mitigation: draft early, peer-review before submission.

## Level-2 evolution items (post-v0.3 success, deferred)

1. Automate the adoption signal — implement opt-in telemetry so install pings are directly measurable.
2. CI-driven compat matrix — clone awesome-agent-skills, run top N skills against v0.3 on every release, auto-update VERIFIED status.
3. Curated allow-list profiles — ship `skills-watch allow --profile <name>` for popular-but-noisy skills.

None blocks shipping v0.3.

## Phase 0 complete. Proceeding to Phase 1.
