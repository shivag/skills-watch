# Spike: risk-category taxonomy (prior art + proposed set)

**Question:** what taxonomy should skills-watch use for block-reason labels? Plain-English, ATT&CK codes, or both?

## Prior art surveyed

### OWASP LLM Top 10 (2025 edition)
Canonical compact taxonomy. 10 categories, short codes `LLM01`–`LLM10`.
Source: https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf

| skills-watch category | OWASP 2025 code |
|---|---|
| CRED-LEAK, PII-LEAK | LLM02 Sensitive Information Disclosure |
| SUPPLY-CHAIN | LLM03 Supply Chain |
| INGRESS-EXEC, PROMPT-INJECT | LLM01 Prompt Injection + LLM03 |
| EXFIL, EGRESS-ANOMALY | LLM06 Excessive Agency |
| BACKDOOR, CONFIG-TAMPER | LLM04 Data and Model Poisoning (adjacent) |

### MITRE ATLAS (v5.1.0, Oct 2025)
16 tactics, 84 techniques. More granular than OWASP. Best-fit techniques for our categories:

- `AML.T0051` — LLM Prompt Injection
- `AML.T0053` — LLM Plugin Compromise
- `AML.T0086` — Exfiltration via AI Agent Tool Invocation
- `AML.T0024` — Exfiltration via AI Inference API

Sources:
- https://atlas.mitre.org/
- https://www.vectra.ai/topics/mitre-atlas

### Harden-Runner (StepSecurity)
Plain-English labels in the primary UI: `Blocked Call`, `New Endpoint`, `Suspicious Process`, `Imposter Commit`. **No ATT&CK codes surfaced to the user.** ATT&CK codes live in the JSON log / export only.
Source: https://docs.stepsecurity.io/harden-runner

### CWE
No AI-agent-specific entries yet. Closest generic: `CWE-829 Inclusion of Functionality from Untrusted Source`, `CWE-506 Embedded Malicious Code`. Skip.

## Decision for skills-watch v0.2

**Plain-English labels primary, OWASP + ATLAS codes in the log JSON only.** The ICP (solo devs, not security engineers) should see a human-readable RISK category in stderr; security-aware users analyzing `~/.skills-watch/live.log` programmatically get the ATT&CK/OWASP codes for their SIEM pipelines.

Precedent: this is exactly harden-runner's model.

## Proposed 9 categories

| Code | Human explanation | OWASP | ATLAS |
|---|---|---|---|
| `CRED-LEAK` | A skill tried to read credentials, API keys, or private keys. | LLM02 | AML.T0024 |
| `PII-LEAK` | A skill tried to read personal info (git identity, shell history, etc). | LLM02 | — |
| `CONFIG-TAMPER` | A skill tried to write to a system/shell config file. Classic backdoor vector. | LLM04 | — |
| `BACKDOOR` | A skill tried to install persistence (cron, launchd, RC files). | LLM04 | AML.T0053 |
| `SUPPLY-CHAIN` | A skill tried to install packages mid-run (`pip install`, `npm install`). | LLM03 | AML.T0053 |
| `INGRESS-EXEC` | A skill tried to fetch content and immediately execute it (`curl \| sh`). | LLM01+03 | AML.T0053 |
| `EXFIL` | A skill tried to POST data or open an exfil channel to a non-allowlisted host. | LLM06 | AML.T0086 |
| `EGRESS-ANOMALY` | A skill tried to connect to a host we don't recognize (may be legit, may not). | LLM06 | — |
| `PROMPT-INJECT` | A skill fetched content and the content appears to drive the next tool call. (Stretch goal — may defer to v0.3.) | LLM01 | AML.T0051 |

**Naming notes (following research):**
- Renamed `EGRESS-UNKNOWN` → `EGRESS-ANOMALY` — harden-runner's "New Endpoint" framing reads better. "Unknown" implies ignorance; "anomaly" implies we noticed.
- `PROMPT-INJECT` added as ingress-side flag (research shows 91% of malicious chains start here).

## Stderr template using the taxonomy

```
BLOCKED: <VERB> <OBJECT>
RISK: <CODE> — <one-line explanation>
WHEN IT MIGHT BE FINE: <one-line>
TO ALLOW: <exact command, scoped if skill context known>
```

Log JSON enrichment (for SIEM / automation):
```
<iso8601> BLOCK <VERB> <OBJECT> [risk=<CODE>] [owasp=LLM0X] [atlas=AML.T####] [skill=<name>]
```
