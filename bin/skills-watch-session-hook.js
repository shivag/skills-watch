#!/usr/bin/env node
'use strict';
const { run } = require('../src/session-hook');
run().catch((err) => {
  process.stderr.write(`skills-watch-session-hook error: ${err && err.message ? err.message : err}\n`);
  process.exit(0);
});
