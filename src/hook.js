'use strict';
const { readConfig, readSidecar, logLine, readStdin } = require('./common');
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
  findAllMatches,
} = require('./policy');

function buildSuggestion(template, skill) {
  const scope = skill ? `--for ${skill} ` : '';
  return template.replace('{SCOPE}', scope);
}

function scopeLabel(skill) {
  return skill ? `for ${skill}` : 'globally';
}

function decide(payload, skill, config) {
  const tool = payload && payload.tool_name;
  const input = (payload && payload.tool_input) || {};
  const allowPaths = effectiveAllowPaths(config, skill);
  const allowHosts = effectiveAllowHosts(config, skill);

  const fsTools = ['Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit'];
  if (fsTools.includes(tool)) {
    const p = input.file_path || input.path || input.notebook_path || '';
    const isWrite = tool !== 'Read';
    const verb = isWrite ? 'WRITE' : 'READ';
    const mode = isWrite ? 'write' : 'read';
    if (p && isPathDenied(p, allowPaths, mode)) {
      return {
        action: 'BLOCK',
        verb,
        object: p,
        message: `npx skills-watch allow add {SCOPE}${p}`,
      };
    }
    return { action: 'ALLOW', verb, object: p };
  }

  if (tool === 'WebFetch' || tool === 'WebSearch') {
    const url = input.url || input.query || '';
    let host = '';
    try { host = new URL(url).hostname; } catch { /* query-only; no host */ }
    if (host && isHostDenied(host, allowHosts)) {
      return {
        action: 'BLOCK',
        verb: 'CONNECT',
        object: host,
        message: `npx skills-watch allow add-host {SCOPE}${host}`,
      };
    }
    return { action: 'ALLOW', verb: 'CONNECT', object: host || url };
  }

  if (tool === 'Bash') {
    const cmd = input.command || '';

    for (const { re, label } of INSTALLER_PATTERNS) {
      if (re.test(cmd)) {
        return {
          action: 'BLOCK',
          verb: 'EXEC-INSTALLER',
          object: label,
          message: `This is not user-recoverable by allow-listing; mid-run package installs are blocked by policy. Run the install outside the skill, or revise the skill.`,
        };
      }
    }

    for (const re of VAR_READ_PATTERNS) {
      const matches = findAllMatches(re, cmd);
      for (const m of matches) {
        const name = m[1];
        if (SENSITIVE_VAR_PREFIXES.test(name)) {
          return {
            action: 'BLOCK',
            verb: 'ENV-READ',
            object: name,
            message: `Reading ${name} is blocked by policy. Revise the skill or set the var to empty before invocation.`,
          };
        }
      }
    }

    for (const re of HOST_EXTRACT_PATTERNS) {
      const matches = findAllMatches(re, cmd);
      for (const m of matches) {
        const host = m[1];
        if (host && isHostDenied(host, allowHosts)) {
          return {
            action: 'BLOCK',
            verb: 'BASH-EGRESS',
            object: host,
            message: `npx skills-watch allow add-host {SCOPE}${host}`,
          };
        }
      }
    }

    for (const re of SECRET_READ_PATTERNS) {
      const matches = findAllMatches(re, cmd);
      for (const m of matches) {
        const raw = m[1].replace(/^["']|["']$/g, '');
        if (isPathDenied(raw, allowPaths)) {
          return {
            action: 'BLOCK',
            verb: 'BASH-READ',
            object: raw,
            message: `npx skills-watch allow add {SCOPE}${raw}`,
          };
        }
      }
    }

    return { action: 'ALLOW', verb: 'BASH', object: cmd.slice(0, 80) };
  }

  return { action: 'ALLOW', verb: tool || 'UNKNOWN', object: '' };
}

async function run() {
  const raw = await readStdin();
  let payload = {};
  try { payload = JSON.parse(raw); } catch { /* pass through */ }
  const skill = readSidecar();
  const config = readConfig();
  const decision = decide(payload, skill, config);
  const ts = new Date().toISOString();
  const skillTag = skill ? ` [skill=${skill}]` : '';

  if (decision.action === 'BLOCK') {
    logLine(`${ts} BLOCK ${decision.verb} ${decision.object}${skillTag}`);
    const suggestion = buildSuggestion(decision.message, skill);
    const scope = scopeLabel(skill);
    process.stderr.write(
      `BLOCKED: ${decision.verb} ${decision.object} — to allow ${scope}, run: ${suggestion}\n`
    );
    process.exit(2);
  }

  logLine(`${ts} ALLOW ${decision.verb} ${decision.object}${skillTag}`);
  process.exit(0);
}

module.exports = { decide, run };
