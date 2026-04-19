'use strict';
// `skills-watch risk` — a reader over the existing live log + config.
// No new enforcement, no new state, no new config fields. Pure dashboard.

const fs = require('fs');
const { LOG_PATH, readConfig, readSidecar } = require('./common');
const { DENY_PATHS_RAW } = require('./policy');

function parseDuration(s) {
  const m = /^(\d+)([smhd])$/.exec(s);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }[m[2]];
  return n * unit;
}

const LINE_RE = /^(\S+)\s+(ALLOW|BLOCK)\s+(LOUD\s+)?(\S+)\s+(.*?)(?:\s+\[risk=(\S+)\])?(?:\s+\[owasp=\S+\])?(?:\s+\[atlas=\S+\])?(?:\s+\[skill=([^\]]+)\])?$/;

function parseLogLines(raw, sinceMs) {
  const lines = raw.split('\n').filter(Boolean);
  const cutoff = sinceMs ? new Date(Date.now() - sinceMs) : null;
  const parsed = [];
  for (const line of lines) {
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const ts = new Date(m[1]);
    if (cutoff && ts < cutoff) continue;
    parsed.push({
      ts,
      action: m[2],
      loud: Boolean(m[3]),
      verb: m[4],
      object: (m[5] || '').trim(),
      risk: m[6] || null,
      skill: m[7] || null,
    });
  }
  return parsed;
}

function countBy(events, keyFn) {
  const out = new Map();
  for (const e of events) {
    const k = keyFn(e);
    if (k === null || k === undefined) continue;
    out.set(k, (out.get(k) || 0) + 1);
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]);
}

function formatAgo(date) {
  if (!date) return 'never';
  const ms = Date.now() - date.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function renderDashboard(events, context) {
  const total = events.length;
  const blocks = events.filter((e) => e.action === 'BLOCK');
  const louds = events.filter((e) => e.loud);
  const lines = [];

  // Header line.
  const scope = context.since ? `last ${context.sinceLabel}` : 'since log start';
  lines.push(
    `SKILLS-WATCH RISK: ${total} calls, ${blocks.length} blocked, ${louds.length} first-seen hosts (${scope})`
  );
  lines.push('');

  if (total === 0) {
    lines.push('No events yet. Invoke a skill in Claude Code after installing, then re-run.');
    lines.push(`(Log: ${LOG_PATH})`);
    return lines.join('\n');
  }

  // Block breakdown by category.
  if (blocks.length) {
    lines.push('Blocks by risk category:');
    for (const [cat, n] of countBy(blocks, (e) => e.risk || 'UNKNOWN')) {
      lines.push(`  ${String(n).padStart(3)}  ${cat}`);
    }
    lines.push('');
  }

  // Top hosts (first-seen).
  const loudHosts = [...new Set(louds.map((e) => e.object).filter(Boolean))];
  if (loudHosts.length) {
    lines.push(`First-seen hosts (${loudHosts.length}):`);
    for (const h of loudHosts.slice(0, 8)) lines.push(`  ${h}`);
    if (loudHosts.length > 8) lines.push(`  ... +${loudHosts.length - 8} more`);
    lines.push('');
  }

  // Top skills by activity.
  const skills = countBy(events, (e) => e.skill);
  if (skills.length) {
    lines.push('Most-active skill contexts:');
    for (const [s, n] of skills.slice(0, 5)) lines.push(`  ${String(n).padStart(3)}  /${s}`);
    lines.push('');
  }

  // Current config hint.
  const cfg = context.config || {};
  const globalPaths = ((cfg.allow || {}).paths || []).length;
  const globalHosts = ((cfg.allow || {}).hosts || []).length;
  const perSkillCount = Object.keys(cfg.per_skill || {}).length;
  lines.push(
    `Allow-list: ${globalPaths} global paths, ${globalHosts} global hosts, ${perSkillCount} per-skill profiles.`
  );
  lines.push(`Last event: ${formatAgo(events[events.length - 1].ts)}.`);
  lines.push(`Log: ${LOG_PATH}`);

  return lines.join('\n');
}

function runRisk(args) {
  let sinceMs = null;
  let sinceLabel = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--since' && args[i + 1]) {
      const d = parseDuration(args[i + 1]);
      if (!d) {
        console.error(`skills-watch risk: invalid --since '${args[i + 1]}'. Use 30s / 10m / 1h / 2d.`);
        process.exit(2);
      }
      sinceMs = d;
      sinceLabel = args[i + 1];
      i++;
    }
  }

  let raw = '';
  try { raw = fs.readFileSync(LOG_PATH, 'utf8'); } catch { /* no log yet */ }
  const events = parseLogLines(raw, sinceMs);
  const config = readConfig();
  const sidecar = readSidecar();
  const output = renderDashboard(events, { since: sinceMs, sinceLabel, config, sidecar });
  console.log(output);
}

module.exports = { runRisk, parseLogLines, renderDashboard, parseDuration };
