'use strict';
const fs = require('fs');
const { LOG_PATH, readStdin } = require('./common');
const { DENY_PATHS_RAW } = require('./policy');

function countLifetimeBlocks() {
  try {
    const data = fs.readFileSync(LOG_PATH, 'utf8');
    return (data.match(/^\S+\s+BLOCK\s/gm) || []).length;
  } catch {
    return 0;
  }
}

async function run() {
  await readStdin(); // drain stdin; SessionStart payload is informational only here
  const ruleCount = DENY_PATHS_RAW.length;
  const lifetimeBlocks = countLifetimeBlocks();

  // stderr is visible to the user only (not fed to Claude).
  const banner =
    lifetimeBlocks > 0
      ? `⚡ skills-watch active — ${ruleCount} deny-list rules. ${lifetimeBlocks} blocks recorded to date. Log: ${LOG_PATH}`
      : `⚡ skills-watch active — ${ruleCount} deny-list rules. Log: ${LOG_PATH}`;
  process.stderr.write(banner + '\n');

  // stdout JSON with hookSpecificOutput.additionalContext is injected into Claude's context.
  const claudeBrief =
    'skills-watch (a runtime security guard) is active on this session. It blocks Claude Code tool calls that ' +
    'read sensitive paths (~/.ssh, ~/.aws, ~/.gnupg, ~/.netrc, shell history, git identity/credentials, ' +
    '~/.agents/*.env, stray .env files outside cwd), attempt to read secret environment variables ' +
    '(AWS_*, ANTHROPIC_*, OPENAI_*, GEMINI_*, GOOGLE_*, GITHUB_TOKEN, NPM_TOKEN, SSH_*), perform mid-run ' +
    'package installs (pip/npm/yarn/pnpm install, curl|sh, wget|sh), or connect to hosts outside a tight ' +
    'allow-list (anthropic.com, openai.com, googleapis.com, github.com, pypi.org, registry.npmjs.org). ' +
    'If a tool call fails with exit 2, the stderr message includes the exact `npx skills-watch allow add ' +
    '[--for <skill>] <path>` command to unblock — relay it to the user verbatim so they can decide whether to allow.';

  const payload = {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: claudeBrief,
    },
  };
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}

module.exports = { run, countLifetimeBlocks };
