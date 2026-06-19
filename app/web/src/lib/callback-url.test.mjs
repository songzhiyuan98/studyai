import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeCallbackUrl } from './callback-url.ts';

test('keeps same-app relative callback paths', () => {
  assert.equal(sanitizeCallbackUrl('/dashboard'), '/dashboard');
  assert.equal(sanitizeCallbackUrl('/study?scope=midterm'), '/study?scope=midterm');
});

test('rejects absolute and protocol-relative callback URLs', () => {
  assert.equal(sanitizeCallbackUrl('http://localhost:3000/dashboard'), '/dashboard');
  assert.equal(sanitizeCallbackUrl('https://evil.example/phish'), '/dashboard');
  assert.equal(sanitizeCallbackUrl('//evil.example/phish'), '/dashboard');
});

test('falls back for empty or malformed callback values', () => {
  assert.equal(sanitizeCallbackUrl(''), '/dashboard');
  assert.equal(sanitizeCallbackUrl(null), '/dashboard');
  assert.equal(sanitizeCallbackUrl('dashboard'), '/dashboard');
});
