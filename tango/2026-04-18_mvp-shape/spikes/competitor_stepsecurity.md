# Competitor teardown: StepSecurity (harden-runner)

**Homepage:** https://stepsecurity.io
**Pricing:** https://stepsecurity.io/pricing
**harden-runner repo:** https://github.com/step-security/harden-runner

## What it does (two sentences)
Hardens GitHub Actions runners with `harden-runner`, a CI agent self-described as *"an EDR for GitHub Actions runners"* — eBPF-style network / process / file-integrity monitoring inside the live job, with **audit** and **block** modes for unexpected outbound connections. Also ships adjacent products for workflow scanning and policy-as-code in CI.

## Pricing
- **Community (free)**: public repos only.
- **Enterprise**: **$16 / contributing-dev / mo**, volume discounts above 100 devs.

## Runtime or static
**Pure runtime.** eBPF hooks inside the executing job observe syscalls, network egress, and file integrity in real time. Audit mode logs; block mode denies. This is the architecturally closest analog to what skills-watch does on a laptop.

## ICP
SecOps / platform-security teams at orgs with mature GitHub Actions usage; SLSA / supply-chain compliance buyers who need artifact signing and policy enforcement.

## Where they're weak — and why it's gold for us
1. **CI-only DNA.** Harden-runner runs inside GitHub Actions jobs. The laptop is not their habitat.
2. **Their "Dev Machine Guard" page 404s today** (https://stepsecurity.io/solutions/dev-machine-guard). They have advertised interest in extending to developer laptops but have not shipped. **This is the single strongest "why now" market signal** for skills-watch — a funded competitor has identified the laptop wedge and not executed on it. Window of opportunity.
3. **Allow-list authoring is tedious.** The repeated ask in harden-runner issues is "ship recommended default policies." That is exactly skills-watch's wedge — universal deny-list, zero authoring.
4. **Targets compliance buyers, not builders.** Their GTM is AppSec/SecOps, not solo devs. Leaves the solo-dev / small-team niche open.

## Why they matter for skills-watch
Strong positive validation of the architecture: if "observe + hard-deny egress in a live job" works in CI, it works on a laptop with a different threat surface. The 404 on Dev Machine Guard is a window to be first on the laptop side for AI skills specifically.

We could legitimately pitch skills-watch as **"harden-runner for Claude skills on your laptop."**

## Pricing implication
Their **$16/dev/mo enterprise** price sits below Socket's $25. For a team offering later, skills-watch team-tier probably lands in **$10–20/dev/mo**, bracketed by these two comps.

## What a user would need to leave them for us
Their buyer isn't our buyer today. CI supply-chain people stay with StepSecurity; laptop skill users come to skills-watch. Only collision is if Dev Machine Guard ever ships — if it does and targets agent skills, we're in direct fight, and the moat becomes our focus on skills.sh + AI-agent community specifically.
