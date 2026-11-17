import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { randomBytes, scryptSync } from 'node:crypto';

async function hiddenInput(label) {
  stdout.write(label);
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive terminal so the password is not echoed.');
  }

  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  return new Promise((resolve, reject) => {
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
        if (key === '\u0003') return finish(new Error('Setup cancelled.'));
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
}

const url = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the process environment first.');
  process.exit(1);
}

const prompts = createInterface({ input: stdin, output: stdout });
const email = (await prompts.question('Owner email: ')).trim().toLowerCase();
const displayName = (await prompts.question('Display name: ')).trim();
prompts.close();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !displayName) {
  console.error('Enter a valid email address and display name.');
  process.exit(1);
}
const password = await hiddenInput('Initial password (at least 12 characters): ');
if (password.length < 12 || password.length > 1024) {
  console.error('Password must contain 12 to 1,024 characters.');
  process.exit(1);
}

const salt = randomBytes(16);
const digest = scryptSync(password, salt, 64);
const passwordHash = `scrypt$${salt.toString('base64url')}$${digest.toString('base64url')}`;
const response = await fetch(`${url}/rest/v1/admin_users`, {
  method: 'POST',
  headers: {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    'content-type': 'application/json',
    Prefer: 'return=minimal',
  },
  body: JSON.stringify({ email, display_name: displayName, password_hash: passwordHash }),
});
if (!response.ok) {
  const reason = (await response.text()).slice(0, 300);
  console.error(`Admin account setup failed (${response.status}): ${reason}`);
  process.exit(1);
}
console.log(`Owner account created for ${email}. Remove the service-role key from this process environment when finished.`);
