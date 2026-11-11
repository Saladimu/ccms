import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

test('C-06 Worker rejects an unconfigured environment without forwarding upstream', async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error('upstream must not be called'); };
  try {
    const request = new Request('https://api.example.test/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://dev.example.test' },
      body: JSON.stringify({ action: 'auth.login', payload: {} })
    });
    const response = await worker.fetch(request, {
      GAS_URL: 'CONFIGURE_DEV_GAS_URL',
      ALLOWED_ORIGINS: '["https://dev.example.test"]'
    });
    const body = await response.json();
    assert.equal(response.status, 500);
    assert.equal(body.error.code, 'CONFIG_ERROR');
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Worker rejects malformed JSON and unsupported methods', async () => {
  const badJson = new Request('https://api.example.test/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{broken'
  });
  const jsonResponse = await worker.fetch(badJson, { GAS_URL: 'CONFIGURE_DEV_GAS_URL', ALLOWED_ORIGINS: '[]' });
  assert.equal(jsonResponse.status, 400);

  const putRequest = new Request('https://api.example.test/api', { method: 'PUT' });
  const methodResponse = await worker.fetch(putRequest, { GAS_URL: 'CONFIGURE_DEV_GAS_URL', ALLOWED_ORIGINS: '[]' });
  assert.equal(methodResponse.status, 405);
});

test('Worker treats meta.token as authenticated and bypasses public cache', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('upstream must not be called'); };
  try {
    const request = new Request('https://api.example.test/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://dev.example.test' },
      body: JSON.stringify({
        action: 'public.info',
        meta: { token: 'sit-session' }
      })
    });
    const response = await worker.fetch(request, {
      GAS_URL: 'CONFIGURE_DEV_GAS_URL',
      ALLOWED_ORIGINS: '["https://dev.example.test"]'
    });
    const body = await response.json();
    assert.equal(response.status, 500);
    assert.equal(body.error.code, 'CONFIG_ERROR');
    assert.equal(response.headers.get('X-CCMS-Cache'), 'BYPASS');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Worker CORS denies origins not present in environment allowlist', async () => {
  const request = new Request('https://api.example.test/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example.test' },
    body: JSON.stringify({ action: 'auth.login', payload: {} })
  });
  const response = await worker.fetch(request, {
    GAS_URL: 'CONFIGURE_DEV_GAS_URL',
    ALLOWED_ORIGINS: '["https://dev.example.test"]'
  });
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'null');
});
