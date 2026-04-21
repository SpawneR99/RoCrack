#!/usr/bin/env node
/**
 * Usage:  npm run hash -- "your password here"
 *         node scripts-cli/hash-password.js "your password"
 * Prints a bcrypt hash to paste into .env as ADMIN_PASSWORD_HASH.
 */
const bcrypt = require('bcryptjs');

const pwd = process.argv.slice(2).join(' ');
if (!pwd) {
  console.error('Usage: npm run hash -- "<your password>"');
  process.exit(1);
}
if (pwd.length < 10) {
  console.error('Refusing to hash a password shorter than 10 characters.');
  process.exit(2);
}
const hash = bcrypt.hashSync(pwd, 12);
console.log(hash);
