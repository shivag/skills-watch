# Draft PR: add a "Security" section to VoltAgent/awesome-agent-skills

**Target:** `https://github.com/VoltAgent/awesome-agent-skills`
**PR title:** Add Security section + skills-watch as inaugural entry

## PR body

> This adds a new **Security** section to awesome-agent-skills, alongside the existing category headings. It's intentionally narrow — only runtime enforcement tools that sit between an agent harness (Claude Code, Cursor, etc.) and its tool calls qualify. Static scanners (Socket, Snyk) and curated audits (skills.sh/audits, VirusTotal OpenClaw) belong in a separate section if we want one, since their mechanism is pre-install signature-scanning rather than runtime enforcement.
>
> Inaugural entry: **[skills-watch](https://github.com/shivag/skills-watch)** — a one-line-install Claude Code hook that blocks SSH-key reads, secret-env-var reads, `curl|sh`, mid-run `pip install`, exfil POSTs, and writes to shell RC files. MIT, ~1,300 LOC, zero external deps, Node 18+.
>
> Motivation: [Snyk's Feb 2026 ToxicSkills report](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) found 13.4% of audited skills had critical issues and 36% had prompt injection. Runtime enforcement is a distinct layer from static auditing; both are needed.

## README diff (proposed)

Add after the existing content, before the Contributing section:

```markdown
## 🛡️ Security

Tools that sit between your agent harness and its tool calls — runtime enforcement, not static audit.

- **[skills-watch](https://github.com/shivag/skills-watch)** — One-line install (`npx skills-watch install`) Claude Code hook that blocks SSH/AWS/env-key reads, mid-run installs, `curl|sh` chains, and exfil POSTs with plain-English explanations. Per-skill allow-lists for skills that legitimately need denied paths. [Demo](https://github.com/shivag/skills-watch#see-it-work-in-30-seconds-before-you-install).
```

## Checklist for submission (once PR is ready)

- [ ] Fork `VoltAgent/awesome-agent-skills`
- [ ] Branch `add-security-section-skills-watch`
- [ ] Apply the README diff above
- [ ] Run `npm run lint` if the repo has one (check)
- [ ] PR body references this Tango session outcome + CVE/ToxicSkills context
- [ ] Follow up comment with install demo screenshot if asked
