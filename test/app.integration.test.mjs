import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

let app;
let baseUrl;
let closeDatabase;
let port;
let testRoot;

function rawRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: '127.0.0.1',
      port,
      path,
      method: options.method ?? 'GET',
      headers: options.headers,
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function api(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  return {
    status: response.status,
    body: await response.json(),
  };
}

before(async () => {
  testRoot = await mkdtemp(join(tmpdir(), 'prompt-words-test-'));
  const staticDir = join(testRoot, 'dist');
  await mkdir(join(staticDir, 'assets'), { recursive: true });
  await writeFile(join(staticDir, 'index.html'), '<!doctype html><main>Prompt Words</main>');
  await writeFile(join(staticDir, 'assets', 'app.js'), 'globalThis.promptWords = true;');
  process.env.PROMPT_WORDS_DB = join(testRoot, 'prompt-words.db');

  const { createAppServer } = await import(`../server/index.mjs?test=${Date.now()}`);
  ({ closeDatabase } = await import('../server/core.mjs'));
  app = createAppServer({ staticDir });
  await new Promise((resolve, reject) => {
    app.once('error', reject);
    app.listen(0, '127.0.0.1', resolve);
  });
  const address = app.address();
  assert(address && typeof address === 'object');
  port = address.port;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (app) await new Promise((resolve, reject) => app.close((error) => error ? reject(error) : resolve()));
  closeDatabase?.();
  if (testRoot) await rm(testRoot, { recursive: true, force: true });
});

test('production server serves the app and assets on Windows-safe paths', async () => {
  const page = await rawRequest('/');
  assert.equal(page.status, 200);
  assert.match(page.body, /Prompt Words/);

  const asset = await rawRequest('/assets/app.js');
  assert.equal(asset.status, 200);
  assert.match(asset.headers['content-type'], /javascript/);
  assert.equal(asset.headers['x-content-type-options'], 'nosniff');
});

test('production server rejects traversal and malformed URL paths', async () => {
  assert.equal((await rawRequest('/%2e%2e%5csecret.txt')).status, 403);
  assert.equal((await rawRequest('/%E0%A4%A')).status, 400);
});

test('prompt API validates malformed and oversized JSON requests', async () => {
  const malformed = await rawRequest('/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(malformed.status, 400);
  assert.match(malformed.body, /JSON 格式不正確/);

  const scalar = await api('/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'null',
  });
  assert.equal(scalar.status, 400);
  assert.match(scalar.body.error, /必須是物件/);

  const oversized = await rawRequest('/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promptZh: 'x'.repeat(1_000_001) }),
  });
  assert.equal(oversized.status, 413);
});

test('prompt API persists, updates, favorites, lists, and deletes a prompt', async () => {
  const firstSave = await api('/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'integration-record',
      title: '整合測試',
      promptZh: '一隻橘貓走過雨夜街道',
      favorite: true,
      metadata: { shotPlan: ['遠景', '特寫'] },
    }),
  });
  assert.equal(firstSave.status, 201);
  assert.equal(firstSave.body.prompt.favorite, true);
  const originalCreatedAt = firstSave.body.prompt.createdAt;

  const update = await api('/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'integration-record',
      title: '整合測試更新',
      promptEn: 'An orange cat crosses a rainy street at night.',
    }),
  });
  assert.equal(update.status, 201);
  assert.equal(update.body.prompt.createdAt, originalCreatedAt);
  assert.equal(update.body.prompt.favorite, true);

  const listed = await api('/api/prompts?limit=10');
  assert.equal(listed.status, 200);
  assert.equal(listed.body.prompts.length, 1);
  assert.equal(listed.body.prompts[0].title, '整合測試更新');

  const favorite = await api('/api/prompts/integration-record/favorite', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ favorite: false }),
  });
  assert.equal(favorite.status, 200);
  assert.equal(favorite.body.prompt.favorite, false);

  const removed = await api('/api/prompts/integration-record', { method: 'DELETE' });
  assert.equal(removed.status, 200);
  assert.equal((await api('/api/prompts?limit=10')).body.prompts.length, 0);
});

test('prompt API returns client errors for incomplete generation and saves', async () => {
  const emptySave = await api('/api/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(emptySave.status, 400);

  const emptyGenerate = await api('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(emptyGenerate.status, 400);
});
