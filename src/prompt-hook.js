'use strict';
const { readStdin, writeSidecar } = require('./common');

const SLASH_RE = /^\s*\/([A-Za-z0-9_.:-]+)(?:\s|$)/;

function extractSkill(prompt) {
  if (typeof prompt !== 'string') return null;
  const m = SLASH_RE.exec(prompt);
  if (!m) return null;
  return m[1];
}

async function run() {
  const raw = await readStdin();
  let payload = {};
  try { payload = JSON.parse(raw); } catch { process.exit(0); return; }
  const skill = extractSkill(payload.prompt || '');
  if (skill) writeSidecar(skill);
  process.exit(0);
}

module.exports = { extractSkill, run };
