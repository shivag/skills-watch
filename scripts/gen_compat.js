#!/usr/bin/env node
'use strict';
// Generates draft rows for docs/compatibility.md by running representative
// tool-call payloads through the real skills-watch decide() function. Not
// shipped in the npm tarball (see .npmignore). Re-run whenever the deny-list
// or risk categories change.

const { decide } = require('../src/hook');
const { EMPTY_CONFIG, HOME } = require('../src/common');
const path = require('path');

const empty = () => JSON.parse(JSON.stringify(EMPTY_CONFIG));

// Each scenario = one or more typical tool-calls for a given skill.
// Status: VERIFIED if constructed from inspecting the skill's own README / SKILL.md
// for its actual payloads; PREDICTED if inferred without that primary source.
const SKILLS = [
  {
    name: 'find-skills',
    slug: 'vercel-labs/find-skills',
    installs: '~579k',
    source: 'README',
    status: 'VERIFIED',
    payloads: [
      { label: 'fetch skills.sh listing', payload: { tool_name: 'WebFetch', tool_input: { url: 'https://skills.sh/api/search?q=test' } } },
      { label: 'display search results', payload: { tool_name: 'Write', tool_input: { file_path: './search-results.md' } } },
    ],
  },
  {
    name: 'pdf',
    slug: 'anthropics/skills/pdf',
    installs: 'official',
    source: 'SKILL.md',
    status: 'VERIFIED',
    payloads: [
      { label: 'read target pdf in cwd', payload: { tool_name: 'Read', tool_input: { file_path: './report.pdf' } } },
      { label: 'write extracted text', payload: { tool_name: 'Write', tool_input: { file_path: './report.txt' } } },
    ],
  },
  {
    name: 'xlsx',
    slug: 'anthropics/skills/xlsx',
    installs: 'official',
    source: 'SKILL.md',
    status: 'VERIFIED',
    payloads: [
      { label: 'open spreadsheet', payload: { tool_name: 'Read', tool_input: { file_path: './data.xlsx' } } },
      { label: 'write edited sheet', payload: { tool_name: 'Write', tool_input: { file_path: './data-edited.xlsx' } } },
    ],
  },
  {
    name: 'docx',
    slug: 'anthropics/skills/docx',
    installs: 'official',
    source: 'SKILL.md',
    status: 'VERIFIED',
    payloads: [
      { label: 'read doc', payload: { tool_name: 'Read', tool_input: { file_path: './letter.docx' } } },
      { label: 'write new doc', payload: { tool_name: 'Write', tool_input: { file_path: './output.docx' } } },
    ],
  },
  {
    name: 'pptx',
    slug: 'anthropics/skills/pptx',
    installs: 'official',
    source: 'SKILL.md',
    status: 'VERIFIED',
    payloads: [
      { label: 'read deck', payload: { tool_name: 'Read', tool_input: { file_path: './deck.pptx' } } },
      { label: 'write new deck', payload: { tool_name: 'Write', tool_input: { file_path: './out.pptx' } } },
    ],
  },
  {
    name: 'skill-creator',
    slug: 'anthropics/skills/skill-creator',
    installs: 'official',
    source: 'SKILL.md',
    status: 'VERIFIED',
    payloads: [
      { label: 'write new SKILL.md under cwd', payload: { tool_name: 'Write', tool_input: { file_path: './skills/my-new-skill/SKILL.md' } } },
      { label: 'list cwd', payload: { tool_name: 'Bash', tool_input: { command: 'ls -la' } } },
    ],
  },
  {
    name: 'consolidate-memory',
    slug: 'anthropics/skills/consolidate-memory',
    installs: 'official',
    source: 'SKILL.md',
    status: 'VERIFIED',
    payloads: [
      { label: 'read cwd memory file', payload: { tool_name: 'Read', tool_input: { file_path: './memory.md' } } },
      { label: 'write consolidated memory', payload: { tool_name: 'Write', tool_input: { file_path: './memory-v2.md' } } },
    ],
  },
  {
    name: 'tango-research',
    slug: 'shivag/tango-research',
    installs: 'niche',
    source: 'SKILL.md',
    status: 'VERIFIED',
    payloads: [
      { label: 'read Gemini key (preferred)', payload: { tool_name: 'Read', tool_input: { file_path: path.join(HOME, '.agents/tango.env') } } },
      { label: 'fetch Gemini API', payload: { tool_name: 'WebFetch', tool_input: { url: 'https://generativelanguage.googleapis.com/v1/models' } } },
      { label: 'write session rubric', payload: { tool_name: 'Write', tool_input: { file_path: './tango/2026-04-19_foo/rubric.md' } } },
    ],
  },
  {
    name: 'tango-product',
    slug: 'shivag/tango-product',
    installs: 'niche',
    source: 'SKILL.md',
    status: 'VERIFIED',
    payloads: [
      { label: 'read Gemini key', payload: { tool_name: 'Read', tool_input: { file_path: path.join(HOME, '.agents/tango.env') } } },
      { label: 'fetch Gemini API', payload: { tool_name: 'WebFetch', tool_input: { url: 'https://generativelanguage.googleapis.com/v1/models' } } },
    ],
  },
  {
    name: 'xano-security',
    slug: 'calycode/xano-tools/packages/xano-skills/skills/xano-security',
    installs: 'unknown',
    source: 'repo inspection',
    status: 'PREDICTED',
    payloads: [
      { label: 'read skill README', payload: { tool_name: 'Read', tool_input: { file_path: './xano-api/README.md' } } },
      { label: 'no outbound calls', payload: { tool_name: 'Bash', tool_input: { command: 'grep -r "SECURITY" .' } } },
    ],
  },
  {
    name: 'web-interface-validation',
    slug: 'third-party (22k stars)',
    installs: '~133k/wk',
    source: 'awesome-agent-skills list',
    status: 'PREDICTED',
    payloads: [
      { label: 'launch headless browser', payload: { tool_name: 'Bash', tool_input: { command: 'npx playwright test' } } },
      { label: 'write screenshots', payload: { tool_name: 'Write', tool_input: { file_path: './screenshots/page.png' } } },
    ],
  },
  {
    name: 'remotion-best-practices',
    slug: 'remotion-dev/...',
    installs: '~117k/wk',
    source: 'awesome-agent-skills list',
    status: 'PREDICTED',
    payloads: [
      { label: 'read video config', payload: { tool_name: 'Read', tool_input: { file_path: './remotion.config.ts' } } },
      { label: 'run render', payload: { tool_name: 'Bash', tool_input: { command: 'npx remotion render' } } },
    ],
  },
];

function runSkill(skill) {
  const results = [];
  for (const { label, payload } of skill.payloads) {
    const r = decide(payload, skill.name, empty());
    results.push({ label, decision: r });
  }
  return results;
}

function classifySkill(results) {
  const blocks = results.filter((r) => r.decision.action === 'BLOCK');
  if (blocks.length === 0) return { verdict: 'allow', overrides: [] };
  const overrides = new Map();
  for (const r of blocks) {
    const d = r.decision;
    let cmd;
    if (d.suggestion_kind === 'path') {
      cmd = `npx skills-watch allow add ${d.suggestion_value}`;
    } else if (d.suggestion_kind === 'host') {
      cmd = `npx skills-watch allow add-host ${d.suggestion_value}`;
    } else {
      cmd = `(no user-recoverable override — ${d.risk_category}; revise the skill or run that step outside)`;
    }
    overrides.set(cmd, d.risk_category);
  }
  return { verdict: 'needs-override', overrides: [...overrides.entries()] };
}

function render(skills) {
  const lines = [];
  lines.push('| Skill | Source | Status | v0.2 verdict | Override (if needed) | Risk categories |');
  lines.push('|---|---|---|---|---|---|');
  for (const s of skills) {
    const results = runSkill(s);
    const cls = classifySkill(results);
    const verdict = cls.verdict === 'allow' ? '✓ allow' : '⚠ needs override';
    const overrideCells = cls.overrides.map(([cmd]) => `\`${cmd}\``).join('<br>') || '—';
    const cats = [...new Set(cls.overrides.map(([, c]) => c))].join(', ') || '—';
    lines.push(
      `| **${s.name}** (${s.slug}) | ${s.source} | ${s.status} | ${verdict} | ${overrideCells} | ${cats} |`
    );
  }
  return lines.join('\n');
}

console.log(render(SKILLS));
