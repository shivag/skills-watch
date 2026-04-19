#!/usr/bin/env node
'use strict';
const { run } = require('../src/prompt-hook');
run().catch(() => process.exit(0));
