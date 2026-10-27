import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiUrl } from '../src/utils/api-url.js';
test('origin-only and API URLs resolve to the same endpoint', () => {
  for (const value of ['https://example.vercel.app', 'https://example.vercel.app/', 'https://example.vercel.app/api', ' https://example.vercel.app/api/ ']) {
    assert.equal(apiUrl(value) + '/auth/login', 'https://example.vercel.app/api/auth/login');
  }
});
test('malformed backend configuration is rejected', () => {
  for (const value of ['not-a-url', 'ftp://example.com', 'https://example.com?x=1', 'https://user:password@example.com']) assert.throws(() => apiUrl(value));
});
test('missing backend configuration fails explicitly instead of using localhost', () => {
  for (const value of [undefined, null, '', '   ']) assert.throws(() => apiUrl(value), /VITE_API_URL is required/);
});
