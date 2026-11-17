import { randomBytes, scrypt as scryptCallback, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, hash, extra] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash || extra) return false;
  const expected = Buffer.from(hash, 'base64url');
  if (expected.length !== 64) return false;
  const actual = await scrypt(password, Buffer.from(salt, 'base64url'), 64) as Buffer;
  return timingSafeEqual(actual, expected);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}
