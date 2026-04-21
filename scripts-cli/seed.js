#!/usr/bin/env node
require('dotenv').config();
const { seedIfEmpty } = require('../src/seed');
console.log(seedIfEmpty());
