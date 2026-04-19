'use strict';
const os = require('os');
const path = require('path');
const fs = require('fs');

const HOME = os.homedir();
const STATE_DIR = path.join(HOME, '.skills-watch');
const CONFIG_PATH = path.join(STATE_DIR, 'config.json');
const SIDECAR_PATH = path.join(STATE_DIR, 'current-skill');
const LOG_PATH = path.join(STATE_DIR, 'live.log');
const CLAUDE_SETTINGS = path.join(HOME, '.claude', 'settings.json');
const LOG_MAX_BYTES = 10 * 1024 * 1024;

const EMPTY_CONFIG = Object.freeze({ allow: { paths: [], hosts: [] }, per_skill: {} });

function ensureStateDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

function expandHome(p) {
  if (typeof p !== 'string') return p;
  if (p === '~') return HOME;
  if (p.startsWith('~/')) return path.join(HOME, p.slice(2));
  return p;
}

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return JSON.parse(JSON.stringify(EMPTY_CONFIG));
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.allow) parsed.allow = { paths: [], hosts: [] };
    if (!parsed.allow.paths) parsed.allow.paths = [];
    if (!parsed.allow.hosts) parsed.allow.hosts = [];
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
  CLAUDE_SETTINGS,
  EMPTY_CONFIG,
  ensureStateDir,
  expandHome,
  readConfig,
  writeConfig,
  readSidecar,
  writeSidecar,
  logLine,
  readStdin,
  readSettings,
  writeSettings,
};
