'use strict';
const os = require('os');
const path = require('path');
const fs = require('fs');

const HOME = os.homedir();
const STATE_DIR = path.join(HOME, '.skills-watch');
const CONFIG_PATH = path.join(STATE_DIR, 'config.json');
const SIDECAR_PATH = path.join(STATE_DIR, 'current-skill');
const LOG_PATH = path.join(STATE_DIR, 'live.log');
const SEEN_HOSTS_PATH = path.join(STATE_DIR, 'seen-hosts');
const CLAUDE_SETTINGS = path.join(HOME, '.claude', 'settings.json');
const LOG_MAX_BYTES = 10 * 1024 * 1024;
const SEEN_HOSTS_MAX_BYTES = 10 * 1024;

let _riskCopyCache = null;
function riskCopy() {
  if (_riskCopyCache) return _riskCopyCache;
  const raw = fs.readFileSync(path.join(__dirname, 'risk-copy.json'), 'utf8');
  _riskCopyCache = JSON.parse(raw);
  return _riskCopyCache;
}

function firstSeenHost(host) {
  if (!host) return false;
  try {
    const data = fs.readFileSync(SEEN_HOSTS_PATH, 'utf8');
    if (data.split('\n').includes(host)) return false;
  } catch { /* no file yet */ }
  ensureStateDir();
  try {
    const stat = fs.statSync(SEEN_HOSTS_PATH);
    if (stat.size > SEEN_HOSTS_MAX_BYTES) fs.truncateSync(SEEN_HOSTS_PATH, 0);
  } catch {}
  fs.appendFileSync(SEEN_HOSTS_PATH, host + '\n');
  return true;
}

const EMPTY_CONFIG = Object.freeze({ allow: { paths: [], hosts: [], install_cwds: [] }, deny: { hosts: [] }, per_skill: {} });

function ensureStateDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

function expandHome(p) {
  if (typeof p !== 'string') return p;
  if (p === '~') return HOME;
  if (p.startsWith('~/')) return path.join(HOME, p.slice(2));
  return p;
}

// Resolve where a Bash command will actually run. Order:
//   1. tool_input.cwd if the model provided one explicitly.
//   2. A leading `cd <path> && …` or `cd <path> ; …` extracted from the command.
//   3. Fall back to the hook process's own cwd (= Claude Code session cwd).
function bashTargetCwd(toolInput) {
  if (toolInput && typeof toolInput.cwd === 'string' && toolInput.cwd) {
    return path.resolve(expandHome(toolInput.cwd));
  }
  const cmd = (toolInput && toolInput.command || '').trim();
  // Match `cd /abs/path && ...`, `cd "with space" && ...`, `cd ~/x ; ...`.
  const m = /^cd\s+(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))\s*(?:&&|;)/.exec(cmd);
  if (m) {
    const target = m[1] || m[2] || m[3];
    const expanded = expandHome(target);
    return path.isAbsolute(expanded)
      ? path.resolve(expanded)
      : path.resolve(process.cwd(), expanded);
  }
  return process.cwd();
}

// True if `target` is the same as, or a descendant of, any of `trustedCwds`.
// Each trusted entry is expanded for `~` and resolved before comparison.
function isUnderTrustedCwd(target, trustedCwds) {
  if (!Array.isArray(trustedCwds) || trustedCwds.length === 0) return false;
  const t = path.resolve(target);
  for (const raw of trustedCwds) {
    if (typeof raw !== 'string' || !raw) continue;
    const trusted = path.resolve(expandHome(raw));
    if (t === trusted) return true;
    if (t.startsWith(trusted + path.sep)) return true;
  }
  return false;
}

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return JSON.parse(JSON.stringify(EMPTY_CONFIG));
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.allow) parsed.allow = { paths: [], hosts: [], install_cwds: [] };
    if (!parsed.allow.paths) parsed.allow.paths = [];
    if (!parsed.allow.hosts) parsed.allow.hosts = [];
    if (!parsed.allow.install_cwds) parsed.allow.install_cwds = [];
    if (!parsed.deny) parsed.deny = { hosts: [] };
    if (!parsed.deny.hosts) parsed.deny.hosts = [];
    if (!parsed.per_skill) parsed.per_skill = {};
    return parsed;
  } catch {
    return JSON.parse(JSON.stringify(EMPTY_CONFIG));
  }
}

function writeConfig(cfg) {
  ensureStateDir();
  const tmp = CONFIG_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + '\n');
  fs.renameSync(tmp, CONFIG_PATH);
}

function readSidecar() {
  // SKILLS_WATCH_FORCE_SKILL overrides the sidecar (used by demo for determinism).
  if ('SKILLS_WATCH_FORCE_SKILL' in process.env) {
    return (process.env.SKILLS_WATCH_FORCE_SKILL || '').trim();
  }
  try { return fs.readFileSync(SIDECAR_PATH, 'utf8').trim(); }
  catch { return ''; }
}

function writeSidecar(name) {
  ensureStateDir();
  const tmp = SIDECAR_PATH + '.tmp';
  fs.writeFileSync(tmp, name || '');
  fs.renameSync(tmp, SIDECAR_PATH);
}

function rotateLogIfNeeded() {
  try {
    const stat = fs.statSync(LOG_PATH);
    if (stat.size > LOG_MAX_BYTES) {
      fs.renameSync(LOG_PATH, LOG_PATH + '.1');
    }
  } catch {}
}

function logLine(line) {
  // SKILLS_WATCH_NOLOG suppresses log writes (used by demo to avoid polluting live.log).
  if (process.env.SKILLS_WATCH_NOLOG === '1') return;
  ensureStateDir();
  rotateLogIfNeeded();
  fs.appendFileSync(LOG_PATH, line + '\n');
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    if (process.stdin.isTTY) { resolve(''); return; }
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
  });
}

function readSettings() {
  try {
    const raw = fs.readFileSync(CLAUDE_SETTINGS, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSettings(settings) {
  fs.mkdirSync(path.dirname(CLAUDE_SETTINGS), { recursive: true });
  const tmp = CLAUDE_SETTINGS + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
  fs.renameSync(tmp, CLAUDE_SETTINGS);
}

module.exports = {
  HOME,
  STATE_DIR,
  CONFIG_PATH,
  SIDECAR_PATH,
  LOG_PATH,
  SEEN_HOSTS_PATH,
  CLAUDE_SETTINGS,
  EMPTY_CONFIG,
  ensureStateDir,
  expandHome,
  bashTargetCwd,
  isUnderTrustedCwd,
  readConfig,
  writeConfig,
  readSidecar,
  writeSidecar,
  logLine,
  readStdin,
  readSettings,
  writeSettings,
  riskCopy,
  firstSeenHost,
};
