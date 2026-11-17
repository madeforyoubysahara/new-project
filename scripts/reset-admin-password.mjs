import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { randomBytes, scryptSync } from 'node:crypto';

if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
  console.error('Run this command in an interactive terminal so the password is not echoed.');
  process.exit(1);
}

const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the correct Supabase project first.');
  process.exit(1);
}

const prompts = createInterface({ input: stdin, output: stdout });
const email = (await prompts.question('Owner email to reset: ')).trim().toLowerCase();
prompts.close();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Enter a valid email address.');
  process.exit(1);
}

stdout.write('New password (at least 12 characters): ');
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');
const password = await new Promise((resolve, reject) => {
  let value = '';
  const finish = (error) => {
    stdin.setRawMode(false);
    stdin.pause();
    stdin.removeListener('data', onData);
    stdout.write('\n');
    if (error) reject(error);
    else resolve(value);
  };
  const onData = (chunk) => {
    for (const key of chunk) {
      if (key === '\u0003') return finish(new Error('Password reset cancelled.'));
      if (key === '\r' || key === '\n') return finish();
      if (key === '\u007f' || key === '\b') {
        value = value.slice(0, -1);
        continue;
      }
      if (key >= ' ') value += key;
    }
  };
  stdin.on('data', onData);
});

if (password.length < 12 || password.length > 1024) {
  console.error('Password must contain 12 to 1,024 characters.');
  process.exit(1);
}

const salt = randomBytes(16);
const digest = scryptSync(password, salt, 64);
const passwordHash = `scrypt$${salt.toString('base64url')}$${digest.toString('base64url')}`;
const query = new URLSearchParams({
  email: `eq.${email}`,
  select: 'email',
});
const response = await fetch(`${url}/rest/v1/admin_users?${query}`, {
  method: 'PATCH',
  headers: {
    apikey: serviceKey,
    authorization: ['Bearer ', serviceKey].join(''),
    'content-type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({ password_hash: passwordHash, updated_at: new Date().toISOString() }),
});

if (!response.ok) {
  const reason = (await response.text()).slice(0, 300);
  console.error(`Admin password reset failed (${response.status}): ${reason}`);
  process.exit(1);
}

const updatedUsers = await response.json();
if (!Array.isArray(updatedUsers) || updatedUsers.length !== 1) {
  console.error('No matching owner account was updated. Check the email and Supabase project.');
  process.exit(1);
}

console.log(`Owner password reset for ${updatedUsers[0].email}.`);
