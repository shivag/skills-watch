'use strict';
const path = require('path');
const { expandHome } = require('./common');

const DENY_PATHS_RAW = [
  '~/.ssh',
  '~/.aws',
  '~/.gnupg',
  '~/.netrc',
  '~/.docker/config.json',
  '~/.agents/.env',
  '~/.agents/tango.env',
  '~/.zsh_history',
  '~/.bash_history',
  '~/.gitconfig',
  '~/.git-credentials',
  '~/.config/git/credentials',
];

const DEFAULT_ALLOW_HOSTS = [
  '*.anthropic.com',
  'api.openai.com',
  'generativelanguage.googleapis.com',
  'github.com',
  'pypi.org',
  'registry.npmjs.org',
];

const INSTALLER_PATTERNS = [
  { re: /\bpip3?\s+install\b/, label: 'pip install' },
  { re: /\bnpm\s+install\b/, label: 'npm install' },
  { re: /\byarn\s+add\b/, label: 'yarn add' },
  { re: /\bpnpm\s+add\b/, label: 'pnpm add' },
  { re: /\bcurl\b[^|;]*\|\s*sh\b/, label: 'curl|sh' },
  { re: /\bwget\b[^|;]*\|\s*sh\b/, label: 'wget|sh' },
];

const SENSITIVE_VAR_PREFIXES = /^(AWS_|ANTHROPIC_|OPENAI_|GEMINI_|GOOGLE_|GITHUB_TOKEN|NPM_TOKEN|SSH_)/;

const VAR_READ_PATTERNS = [
  /\bprintenv\s+(\w+)/g,
  /\becho\s+\$\{?(\w+)\}?/g,
  /\benv\s*\|\s*grep\s+(?:-\w+\s+)?['"]?(\w+)/g,
];

const HOST_EXTRACT_PATTERNS = [
  /\bcurl\s+(?:-\w+\s+\S*\s+)*(?:https?:\/\/)?([a-zA-Z0-9][\w.-]*\.[a-zA-Z]{2,})/g,
  /\bwget\s+(?:-\w+\s+\S*\s+)*(?:https?:\/\/)?([a-zA-Z0-9][\w.-]*\.[a-zA-Z]{2,})/g,
  /\bgit\s+(?:push|clone|fetch|pull)\s+(?:[\w@:.+-]+@)?([a-zA-Z0-9][\w.-]*\.[a-zA-Z]{2,})/g,
];

const SECRET_READ_PATTERNS = [
  /\b(?:cat|less|more|head|tail|bat)\s+(?:-\w+\s+)*([^\s|;&]+)/g,
];

function denyPaths() {
  return DENY_PATHS_RAW.map(expandHome);
}

function effectiveAllowPaths(config, skill) {
  const globalList = (config && config.allow && config.allow.paths) || [];
  const perSkillList = (skill && config && config.per_skill && config.per_skill[skill] && config.per_skill[skill].paths) || [];
  return new Set([...globalList, ...perSkillList].map(expandHome));
}

function effectiveAllowHosts(config, skill) {
  const globalList = (config && config.allow && config.allow.hosts) || [];
  const perSkillList = (skill && config && config.per_skill && config.per_skill[skill] && config.per_skill[skill].hosts) || [];
  return new Set([...DEFAULT_ALLOW_HOSTS, ...globalList, ...perSkillList]);
}

function isPathExplicitlyAllowed(absPath, rawPath, allowSet) {
  if (allowSet.has(absPath)) return true;
  if (allowSet.has(rawPath)) return true;
  for (const entry of allowSet) {
    if (entry === absPath) return true;
    if (absPath.startsWith(entry.endsWith('/') ? entry : entry + '/')) return true;
    if (entry.endsWith('/') && absPath + '/' === entry) return true;
  }
  return false;
}

function isPathDenied(rawPath, allowSet) {
  if (!rawPath) return false;
  const abs = path.resolve(expandHome(rawPath));
  if (isPathExplicitlyAllowed(abs, rawPath, allowSet)) return false;
  for (const deny of denyPaths()) {
    if (abs === deny) return true;
    if (abs.startsWith(deny + '/')) return true;
  }
  if (path.basename(abs) === '.env') {
    const cwd = process.cwd();
    if (!abs.startsWith(cwd + '/') && abs !== path.join(cwd, '.env')) {
      return true;
    }
  }
  return false;
}

function hostMatches(host, pattern) {
  if (host === pattern) return true;
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1);
    if (host === pattern.slice(2)) return true;
    if (host.endsWith(suffix)) return true;
  }
  if (host.endsWith('.' + pattern)) return true;
  return false;
}

function isHostDenied(host, allowSet) {
  if (!host) return false;
  for (const allow of allowSet) {
    if (hostMatches(host, allow)) return false;
  }
  return true;
}

function findAllMatches(re, str) {
  const results = [];
  const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m;
  while ((m = global.exec(str)) !== null) results.push(m);
  return results;
}

module.exports = {
  DENY_PATHS_RAW,
  DEFAULT_ALLOW_HOSTS,
  INSTALLER_PATTERNS,
  SENSITIVE_VAR_PREFIXES,
  VAR_READ_PATTERNS,
  HOST_EXTRACT_PATTERNS,
  SECRET_READ_PATTERNS,
  denyPaths,
  effectiveAllowPaths,
  effectiveAllowHosts,
  isPathDenied,
  isHostDenied,
  hostMatches,
  findAllMatches,
};
