'use strict';
const {
  readConfig,
  readSidecar,
  logLine,
  readStdin,
  riskCopy,
  firstSeenHost,
  bashTargetCwd,
  isUnderTrustedCwd,
} = require('./common');
const {
  effectiveAllowPaths,
  effectiveAllowHosts,
  isPathDenied,
  isHostDenied,
  INSTALLER_PATTERNS,
  SENSITIVE_VAR_PREFIXES,
  VAR_READ_PATTERNS,
  HOST_EXTRACT_PATTERNS,
  SECRET_READ_PATTERNS,
  INGRESS_EXEC_PATTERNS,
  EGRESS_DATA_PATTERNS,
  findAllMatches,
} = require('./policy');

const VERB_FOR_TOOL = {
  Read: 'READ',
  Write: 'WRITE',
  Edit: 'WRITE',
  MultiEdit: 'WRITE',
  NotebookEdit: 'WRITE',
  WebFetch: 'CONNECT',
  WebSearch: 'CONNECT',
  Bash: 'BASH',
};

function allowSuggestion(kind, value, skill) {
  const scope = skill ? `--for ${skill} ` : '';
  if (kind === 'path') return `npx skills-watch allow add ${scope}${value}`;
  if (kind === 'host') return `npx skills-watch allow add-host ${scope}${value}`;
  return null;
}

function policyNoteBlock(category) {
  // Explanation-only; no allow command makes sense (e.g. SUPPLY-CHAIN, INGRESS-EXEC).
  return `Reconsider the skill's design or its invocation context; no simple per-path or per-host allow will fix this.`;
}

function scopeLabel(skill) {
  return skill ? `for ${skill}` : 'globally';
}

// Build a decision object; pure function, unit-testable.
function decide(payload, skill, config) {
  const tool = payload && payload.tool_name;
  const input = (payload && payload.tool_input) || {};
  const allowPaths = effectiveAllowPaths(config, skill);
  const allowHosts = effectiveAllowHosts(config, skill);

  // Filesystem tools -------------------------------------------------------
  const fsTools = ['Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit'];
  if (fsTools.includes(tool)) {
    const p = input.file_path || input.path || input.notebook_path || '';
    const isWrite = tool !== 'Read';
    const verb = isWrite ? 'WRITE' : 'READ';
    const mode = isWrite ? 'write' : 'read';
    if (p && isPathDenied(p, allowPaths, mode)) {
      const category = isWrite ? 'PERSISTENCE-ATTEMPT' : 'SENSITIVE-LEAK';
      // Heuristic: writes to shell-rc / cron count as persistence; writes to creds are still SENSITIVE-LEAK.
      return {
        action: 'BLOCK',
        verb,
        object: p,
        risk_category: category,
        suggestion_kind: 'path',
        suggestion_value: p,
      };
    }
    return { action: 'ALLOW', verb, object: p };
  }

  // WebFetch / WebSearch ---------------------------------------------------
  if (tool === 'WebFetch' || tool === 'WebSearch') {
    const url = input.url || input.query || '';
    let host = '';
    let scheme = '';
    try {
      const u = new URL(url);
      host = u.hostname;
      scheme = u.protocol.replace(':', '');
    } catch { /* query-only search; no URL */ }

    if (scheme === 'file') {
      return {
        action: 'BLOCK',
        verb: 'CONNECT',
        object: url,
        risk_category: 'SENSITIVE-LEAK',
        suggestion_kind: null,
      };
    }

    // v0.2 rebalance: http(s) WebFetch to any host is allow-and-log, except
    // explicit deny.hosts, and no longer requires allow-list membership.
    if (host && config && config.deny && (config.deny.hosts || []).includes(host)) {
      return {
        action: 'BLOCK',
        verb: 'CONNECT',
        object: host,
        risk_category: 'UNAUTHORIZED-EGRESS',
        suggestion_kind: 'host-remove-deny',
        suggestion_value: host,
      };
    }

    const loud = host ? firstSeenHost(host) : false;
    return { action: 'ALLOW', verb: 'CONNECT', object: host || url, loud };
  }

  // Bash -------------------------------------------------------------------
  if (tool === 'Bash') {
    const cmd = input.command || '';

    // 1. Installer (supply-chain). If the install would happen under a
    // user-trusted cwd (allow.install_cwds), let it through with a tagged log.
    for (const { re, label } of INSTALLER_PATTERNS) {
      if (re.test(cmd)) {
        const trustedCwds = (config && config.allow && config.allow.install_cwds) || [];
        const targetCwd = bashTargetCwd(input);
        if (isUnderTrustedCwd(targetCwd, trustedCwds)) {
          return {
            action: 'ALLOW',
            verb: 'EXEC-INSTALLER',
            object: label,
            trusted_install_cwd: targetCwd,
          };
        }
        return {
          action: 'BLOCK',
          verb: 'EXEC-INSTALLER',
          object: label,
          risk_category: 'SUPPLY-CHAIN',
          suggestion_kind: null,
        };
      }
    }

    // 2. Ingress-exec (curl|sh, wget&&chmod+x).
    for (const re of INGRESS_EXEC_PATTERNS) {
      if (re.test(cmd)) {
        return {
          action: 'BLOCK',
          verb: 'INGRESS-EXEC',
          object: cmd.slice(0, 80),
          risk_category: 'INGRESS-EXEC',
          suggestion_kind: null,
        };
      }
    }

    // 3. Egress data (POST, -d @, --data-binary @).
    for (const re of EGRESS_DATA_PATTERNS) {
      if (re.test(cmd)) {
        // Try to extract destination host for a better message.
        let host = '';
        for (const hostRe of HOST_EXTRACT_PATTERNS) {
          const matches = findAllMatches(hostRe, cmd);
          if (matches.length) { host = matches[0][1]; break; }
        }
        return {
          action: 'BLOCK',
          verb: 'BASH-EGRESS',
          object: host || cmd.slice(0, 80),
          risk_category: 'UNAUTHORIZED-EGRESS',
          suggestion_kind: host ? 'host' : null,
          suggestion_value: host || null,
        };
      }
    }

    // 4. Env-var read of sensitive var.
    for (const re of VAR_READ_PATTERNS) {
      const matches = findAllMatches(re, cmd);
      for (const m of matches) {
        const name = m[1];
        if (SENSITIVE_VAR_PREFIXES.test(name)) {
          return {
            action: 'BLOCK',
            verb: 'ENV-READ',
            object: name,
            risk_category: 'SENSITIVE-LEAK',
            suggestion_kind: null,
          };
        }
      }
    }

    // 5. Sensitive-path read via cat/less/head/etc.
    for (const re of SECRET_READ_PATTERNS) {
      const matches = findAllMatches(re, cmd);
      for (const m of matches) {
        const raw = m[1].replace(/^["']|["']$/g, '');
        if (isPathDenied(raw, allowPaths, 'read')) {
          return {
            action: 'BLOCK',
            verb: 'BASH-READ',
            object: raw,
            risk_category: 'SENSITIVE-LEAK',
            suggestion_kind: 'path',
            suggestion_value: raw,
          };
        }
      }
    }

    // 6. Explicit deny-host check for curl/wget egress.
    for (const re of HOST_EXTRACT_PATTERNS) {
      const matches = findAllMatches(re, cmd);
      for (const m of matches) {
        const host = m[1];
        if (host && config && config.deny && (config.deny.hosts || []).includes(host)) {
          return {
            action: 'BLOCK',
            verb: 'BASH-EGRESS',
            object: host,
            risk_category: 'UNAUTHORIZED-EGRESS',
            suggestion_kind: 'host-remove-deny',
            suggestion_value: host,
          };
        }
      }
    }

    // Not denied — ALLOW, and compute LOUD if curl/wget touches a new host.
    let loud = false;
    for (const re of HOST_EXTRACT_PATTERNS) {
      const matches = findAllMatches(re, cmd);
      if (matches.length && matches[0][1]) {
        loud = firstSeenHost(matches[0][1]);
        break;
      }
    }
    return { action: 'ALLOW', verb: 'BASH', object: cmd.slice(0, 80), loud };
  }

  return { action: 'ALLOW', verb: VERB_FOR_TOOL[tool] || tool || 'UNKNOWN', object: '' };
}

// Produce the 4-line stderr template for a BLOCK decision.
function renderBlockedStderr(decision, skill) {
  const category = decision.risk_category || 'UNKNOWN';
  const copy = riskCopy()[category] || {
    why_usually_bad: 'This action was blocked by policy.',
    when_might_be_fine: 'Review the skill and decide whether to allow.',
  };
  let toAllow;
  if (decision.suggestion_kind === 'path') {
    toAllow = allowSuggestion('path', decision.suggestion_value, skill);
  } else if (decision.suggestion_kind === 'host') {
    toAllow = allowSuggestion('host', decision.suggestion_value, skill);
  } else if (decision.suggestion_kind === 'host-remove-deny') {
    toAllow = `Host ${decision.suggestion_value} is on your deny.hosts list; edit ~/.skills-watch/config.json to remove it.`;
  } else {
    toAllow = policyNoteBlock(category);
  }
  return [
    `BLOCKED: ${decision.verb} ${decision.object}`,
    `RISK: ${category} — ${copy.why_usually_bad}`,
    `WHEN IT MIGHT BE FINE: ${copy.when_might_be_fine}`,
    `TO ALLOW: ${toAllow}`,
  ].join('\n');
}

// Build the log line for either an ALLOW or BLOCK decision.
function renderLogLine(decision, skill) {
  const ts = new Date().toISOString();
  const skillTag = skill ? ` [skill=${skill}]` : '';
  if (decision.action === 'BLOCK') {
    const cat = decision.risk_category || 'UNKNOWN';
    const copy = riskCopy()[cat] || {};
    const owasp = copy.owasp ? ` [owasp=${copy.owasp}]` : '';
    const atlas = copy.atlas ? ` [atlas=${copy.atlas}]` : '';
    return `${ts} BLOCK ${decision.verb} ${decision.object} [risk=${cat}]${owasp}${atlas}${skillTag}`;
  }
  const loud = decision.loud ? 'LOUD ' : '';
  const trusted = decision.trusted_install_cwd
    ? ` [trusted_install_cwd=${decision.trusted_install_cwd}]`
    : '';
  return `${ts} ALLOW ${loud}${decision.verb} ${decision.object}${trusted}${skillTag}`;
}

async function run() {
  const raw = await readStdin();
  let payload = {};
  try { payload = JSON.parse(raw); } catch { /* pass through */ }
  const skill = readSidecar();
  const config = readConfig();
  const decision = decide(payload, skill, config);
  logLine(renderLogLine(decision, skill));

  if (decision.action === 'BLOCK') {
    process.stderr.write(renderBlockedStderr(decision, skill) + '\n');
    process.exit(2);
  }
  process.exit(0);
}

module.exports = { decide, renderBlockedStderr, renderLogLine, run };
