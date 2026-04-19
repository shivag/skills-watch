#!/usr/bin/env node
'use strict';
const { run } = require('../src/hook');
run().catch((err) => {
  process.stderr.write(`skills-watch-hook error: ${err && err.message ? err.message : err}\n`);
  process.exit(0);
});
