'use strict';
const fs = require('fs');
const path = require('path');
const {
  STATE_DIR,
  CONFIG_PATH,
  SIDECAR_PATH,
  LOG_PATH,
  CLAUDE_SETTINGS,
  ensureStateDir,
  readConfig,
  writeConfig,
  readSidecar,
  readSettings,
  writeSettings,
} = require('./common');
const { DENY_PATHS_RAW, DEFAULT_ALLOW_HOSTS } = require('./policy');

const HOOK_TAG = 'skills-watch';

function hookEntries() {
  return {
    PreToolUse: {
      matcher: '',
      hooks: [
        {
          type: 'command',
          command: `${HOOK_TAG}-hook`,
        },
      ],
    },
    UserPromptSubmit: {
      hooks: [
        {
          type: 'command',
          command: `${HOOK_TAG}-prompt-hook`,
        },
      ],
    },
    SessionStart: {
      hooks: [
        {
          type: 'command',
          command: `${HOOK_TAG}-session-hook`,
        },
      ],
    },
  };
}

function hasOurHook(entry) {
  if (!entry) return false;
  const list = Array.isArray(entry) ? entry : [entry];
  for (const e of list) {
    const hooks = (e && e.hooks) || [];
    for (const h of hooks) {
      if (h && typeof h.command === 'string' && h.command.startsWith(HOOK_TAG)) return true;
    }
  }
  return false;
}

function stripOurHook(entry) {
  if (!entry) return entry;
  const list = Array.isArray(entry) ? entry : [entry];
  const kept = list
    .map((e) => {
      const hooks = (e && e.hooks) || [];
      const remaining = hooks.filter(
        (h) => !(h && typeof h.command === 'string' && h.command.startsWith(HOOK_TAG))
      );
      if (remaining.length === 0) return null;
      return { ...e, hooks: remaining };
    })
    .filter(Boolean);
  if (kept.length === 0) return undefined;
  return Array.isArray(entry) ? kept : kept[0];
}

function addHookIfAbsent(settings, kind) {
  if (hasOurHook(settings.hooks[kind])) return false;
  const existing = settings.hooks[kind];
  const ours = hookEntries()[kind];
  if (!existing) settings.hooks[kind] = [ours];
  else if (Array.isArray(existing)) settings.hooks[kind] = [...existing, ours];
  else settings.hooks[kind] = [existing, ours];
  return true;
}

function install() {
  const settings = readSettings() || {};
  if (!settings.hooks) settings.hooks = {};

  const preChanged = addHookIfAbsent(settings, 'PreToolUse');
  const promptChanged = addHookIfAbsent(settings, 'UserPromptSubmit');
  const sessionChanged = addHookIfAbsent(settings, 'SessionStart');

  ensureStateDir();
  if (!fs.existsSync(CONFIG_PATH)) writeConfig(readConfig());

  if (preChanged || promptChanged || sessionChanged) {
    writeSettings(settings);
    console.log(`skills-watch: installed hooks into ${CLAUDE_SETTINGS}`);
    console.log(`  - PreToolUse → ${HOOK_TAG}-hook${preChanged ? '' : ' (already present)'}`);
    console.log(`  - UserPromptSubmit → ${HOOK_TAG}-prompt-hook${promptChanged ? '' : ' (already present)'}`);
    console.log(`  - SessionStart → ${HOOK_TAG}-session-hook${sessionChanged ? '' : ' (already present)'}`);
    console.log(`skills-watch: config at ${CONFIG_PATH}`);
    console.log(`skills-watch: live log at ${LOG_PATH}`);
    console.log('');
    console.log('NOTE: Claude Code reads hooks at session start. Start a new Claude Code session for the hook to take effect.');
    console.log('See it in action before committing:  npx skills-watch demo');
  } else {
    console.log('skills-watch: already installed (no changes).');
  }
}

function uninstall() {
  const settings = readSettings();
  if (!settings || !settings.hooks) {
    console.log('skills-watch: not installed (no ~/.claude/settings.json or no hooks block).');
    return;
  }
  let changed = false;
  for (const kind of ['PreToolUse', 'UserPromptSubmit', 'SessionStart']) {
    if (!settings.hooks[kind]) continue;
    const stripped = stripOurHook(settings.hooks[kind]);
    if (JSON.stringify(stripped) !== JSON.stringify(settings.hooks[kind])) changed = true;
    if (stripped === undefined) delete settings.hooks[kind];
    else settings.hooks[kind] = stripped;
  }
  if (changed) {
    writeSettings(settings);
    console.log('skills-watch: removed hook entries from ~/.claude/settings.json.');
    console.log('skills-watch: config + log preserved (delete ~/.skills-watch/ manually if desired).');
  } else {
    console.log('skills-watch: no skills-watch hooks found; nothing to uninstall.');
  }
}

function status() {
  const settings = readSettings();
  const installed = Boolean(
    settings && settings.hooks && (
      hasOurHook(settings.hooks.PreToolUse) || hasOurHook(settings.hooks.UserPromptSubmit)
    )
  );
  console.log(`install:       ${installed ? 'yes' : 'no'}`);
  console.log(`settings:      ${CLAUDE_SETTINGS}`);
  console.log(`config:        ${CONFIG_PATH}${fs.existsSync(CONFIG_PATH) ? '' : ' (not yet created)'}`);
  console.log(`sidecar:       ${SIDECAR_PATH} = ${JSON.stringify(readSidecar())}`);
  console.log(`live log:      ${LOG_PATH}${fs.existsSync(LOG_PATH) ? '' : ' (empty)'}`);

  const cfg = readConfig();
  console.log('');
  console.log('Universal deny-list (hardcoded):');
  for (const p of DENY_PATHS_RAW) console.log(`  ${p}`);
  console.log('');
  console.log('Default network allow-list:');
  for (const h of DEFAULT_ALLOW_HOSTS) console.log(`  ${h}`);
  console.log('');
  console.log('Global allow-list (from config):');
  for (const p of cfg.allow.paths) console.log(`  path: ${p}`);
  for (const h of cfg.allow.hosts) console.log(`  host: ${h}`);
  if (cfg.allow.paths.length === 0 && cfg.allow.hosts.length === 0) console.log('  (empty)');
  const skills = Object.keys(cfg.per_skill || {});
  if (skills.length) {
    console.log('');
    console.log('Per-skill allow-lists:');
    for (const s of skills) {
      console.log(`  ${s}:`);
      const entry = cfg.per_skill[s] || {};
      for (const p of entry.paths || []) console.log(`    path: ${p}`);
      for (const h of entry.hosts || []) console.log(`    host: ${h}`);
    }
  }
}

function parseDuration(s) {
  const m = /^(\d+)([smhd])$/.exec(s);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }[m[2]];
  return n * unit;
}

function summary(args) {
  let sinceMs = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--since' && args[i + 1]) {
      const d = parseDuration(args[i + 1]);
      if (!d) {
        console.error(`skills-watch: invalid --since '${args[i + 1]}'. Use 30s / 10m / 1h / 2d.`);
        process.exit(2);
      }
      sinceMs = d;
      i++;
    }
  }
  if (!fs.existsSync(LOG_PATH)) {
    console.log('SUMMARY: no log yet. Invoke a skill in Claude Code after installing.');
    return;
  }
  const lines = fs.readFileSync(LOG_PATH, 'utf8').split('\n').filter(Boolean);
  const since = sinceMs ? new Date(Date.now() - sinceMs) : null;
  let allow = 0;
  let block = 0;
  let earliest = null;
  for (const line of lines) {
    const m = /^(\S+)\s+(ALLOW|BLOCK)\s/.exec(line);
    if (!m) continue;
    const ts = new Date(m[1]);
    if (since && ts < since) continue;
    if (!earliest || ts < earliest) earliest = ts;
    if (m[2] === 'ALLOW') allow++;
    else block++;
  }
  const total = allow + block;
  const sinceLabel = earliest ? earliest.toISOString() : 'log start';
  console.log(`SUMMARY: ${total} tool calls, ${block} BLOCKED (since ${sinceLabel})`);
}

function parseForFlag(args) {
  const forIdx = args.indexOf('--for');
  if (forIdx < 0) return { skills: null, rest: args };
  const value = args[forIdx + 1];
  if (!value) {
    console.error("skills-watch: '--for' requires a comma-separated list of skill names.");
    process.exit(2);
  }
  const skills = value.split(',').map((s) => s.trim()).filter(Boolean);
  const rest = args.slice(0, forIdx).concat(args.slice(forIdx + 2));
  return { skills, rest };
}

function ensurePerSkill(cfg, skill) {
  if (!cfg.per_skill[skill]) cfg.per_skill[skill] = { paths: [], hosts: [] };
  if (!cfg.per_skill[skill].paths) cfg.per_skill[skill].paths = [];
  if (!cfg.per_skill[skill].hosts) cfg.per_skill[skill].hosts = [];
}

function allow(args) {
  const sub = args[0];
  const { skills, rest } = parseForFlag(args.slice(1));
  const cfg = readConfig();

  const addToList = (list, val) => {
    if (!list.includes(val)) list.push(val);
  };
  const removeFromList = (list, val) => {
    const i = list.indexOf(val);
    if (i >= 0) list.splice(i, 1);
  };

  function mutate(kind, op, value) {
    if (!value) {
      console.error(`skills-watch: '${sub}' requires a value.`);
      process.exit(2);
    }
    if (skills && skills.length) {
      for (const s of skills) {
        ensurePerSkill(cfg, s);
        const list = cfg.per_skill[s][kind];
        op === 'add' ? addToList(list, value) : removeFromList(list, value);
      }
    } else {
      const list = cfg.allow[kind];
      op === 'add' ? addToList(list, value) : removeFromList(list, value);
    }
    writeConfig(cfg);
    const scope = skills ? `per-skill [${skills.join(', ')}]` : 'global';
    console.log(`skills-watch: ${op} ${kind.slice(0, -1)} ${value} (${scope}).`);
  }

  switch (sub) {
    case 'add':
      mutate('paths', 'add', rest[0]);
      break;
    case 'add-host':
      mutate('hosts', 'add', rest[0]);
      break;
    case 'remove':
      mutate('paths', 'remove', rest[0]);
      break;
    case 'remove-host':
      mutate('hosts', 'remove', rest[0]);
      break;
    case 'list':
      listAllow(cfg);
      break;
    default:
      console.error(`skills-watch: unknown 'allow' subcommand '${sub}'.`);
      console.error("  Try: allow {add | add-host | remove | remove-host | list} [--for <skill-csv>] <value>");
      process.exit(2);
  }
}

function listAllow(cfg) {
  console.log('Global allow-list:');
  if (cfg.allow.paths.length === 0 && cfg.allow.hosts.length === 0) console.log('  (empty)');
  for (const p of cfg.allow.paths) console.log(`  path:  ${p}`);
  for (const h of cfg.allow.hosts) console.log(`  host:  ${h}`);
  const skills = Object.keys(cfg.per_skill || {});
  if (skills.length) {
    console.log('');
    console.log('Per-skill allow-lists:');
    for (const s of skills) {
      console.log(`  [${s}]`);
      const entry = cfg.per_skill[s] || {};
      for (const p of entry.paths || []) console.log(`    path:  ${p}`);
      for (const h of entry.hosts || []) console.log(`    host:  ${h}`);
      if ((entry.paths || []).length === 0 && (entry.hosts || []).length === 0) console.log('    (empty)');
    }
  }
}

function help() {
  console.log(`skills-watch — a safety belt for Claude Code

Usage:
  skills-watch install
  skills-watch uninstall
  skills-watch status
  skills-watch demo
  skills-watch summary [--since 1h|30m|2d]
  skills-watch allow add        [--for <skill-csv>] <path>
  skills-watch allow add-host   [--for <skill-csv>] <host>
  skills-watch allow remove     [--for <skill-csv>] <path>
  skills-watch allow remove-host [--for <skill-csv>] <host>
  skills-watch allow list

Quick start:
  npx skills-watch demo       # see 7 simulated attacks get blocked, before you install
  npx skills-watch install    # install the guard (writes hooks to ~/.claude/settings.json)

After install, start a new Claude Code session for the hook to take effect.

Live observability in a second terminal:
  tail -f ${LOG_PATH}

Docs: https://github.com/shivag/skills-watch`);
}

function main(argv) {
  const [sub, ...rest] = argv;
  switch (sub) {
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      help();
      break;
    case 'install':
      install();
      break;
    case 'uninstall':
      uninstall();
      break;
    case 'status':
      status();
      break;
    case 'summary':
      summary(rest);
      break;
    case 'demo': {
      const { runDemo } = require('./demo');
      runDemo().then((code) => process.exit(code)).catch((err) => {
        console.error(`skills-watch demo: ${err && err.message ? err.message : err}`);
        process.exit(1);
      });
      break;
    }
    case 'allow':
      allow(rest);
      break;
    case 'version':
    case '--version':
    case '-v':
      console.log(require('../package.json').version);
      break;
    default:
      console.error(`skills-watch: unknown subcommand '${sub}'`);
      help();
      process.exit(2);
  }
}

module.exports = {
  main,
  install,
  uninstall,
  status,
  summary,
  allow,
  listAllow,
  help,
  parseForFlag,
};
