import test from 'node:test';
import assert from 'node:assert/strict';
import { randomToken, sha256, timingSafeEqualText, safeFileId } from '../src/utils/ids.js';

test('session tokens are high-entropy url-safe strings and are never returned as hashes', () => {
  const token = randomToken(32);
  assert.match(token, /^[A-Za-z0-9_-]+$/);
  assert.ok(token.length >= 40);
  assert.notEqual(token, sha256(token));
});

test('constant-time comparison helper rejects mismatched values and lengths', () => {
  assert.equal(timingSafeEqualText('abc', 'abc'), true);
  assert.equal(timingSafeEqualText('abc', 'abd'), false);
  assert.equal(timingSafeEqualText('abc', 'ab'), false);
});

test('generated storage ids contain no path characters', () => {
  const value = safeFileId();
  assert.match(value, /^[a-f0-9]{36}$/);
  assert.ok(!value.includes('/') && !value.includes('\\'));
});
