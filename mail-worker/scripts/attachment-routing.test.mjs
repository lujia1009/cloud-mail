import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const serviceSource = await readFile(new URL('../src/service/kv-obj-service.js', import.meta.url), 'utf8');
const serviceUrl = moduleUrl(serviceSource);
// Exercise the production fetch dispatcher with unrelated API/cron dependencies isolated.
const entrySource = (await readFile(new URL('../src/index.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\r?$/gm, '')
  .replace('export default', `import kvObjService from '${serviceUrl}';
    const app = { fetch: () => new Response('api') }; const email = () => {};
    export default`);
const { default: worker } = await import(moduleUrl(entrySource));
const types = ['image/jpeg', 'video/mp4', 'audio/mpeg', 'application/pdf', 'application/zip'];

for (const type of types) {
  test(`${type}: canonical and legacy URLs return identical file bytes`, async () => {
    for (const prefix of ['/attachments/', '/mail/attachments/']) {
      const env = {
        kv: { getWithMetadata: async key => {
          assert.equal(key, 'attachments/file');
          return { value: new Uint8Array([1, 2, 3]).buffer, metadata: { contentType: type, contentDisposition: 'inline' } };
        } },
        assets: { fetch: () => { throw new Error('Attachment reached SPA'); } },
      };
      const response = await worker.fetch(new Request(`https://mail.test${prefix}file`), env);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Content-Type'), type);
      assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [1, 2, 3]);
      const head = await worker.fetch(new Request(`https://mail.test${prefix}file`, { method: 'HEAD' }), env);
      assert.equal(await head.text(), '');
      assert.equal(head.headers.get('Content-Length'), '3');
    }
  });
}

test('missing attachments return 404, writes return 405, normal routes retain SPA/API dispatch', async () => {
  const env = { kv: { getWithMetadata: async () => ({ value: null }) }, assets: { fetch: () => new Response('spa') } };
  const request = (path, method = 'GET') => worker.fetch(new Request(`https://mail.test${path}`, { method }), env);
  assert.equal((await request('/mail/attachments/missing')).status, 404);
  assert.equal((await request('/attachments/file', 'POST')).status, 405);
  assert.equal(await (await request('/mail/123')).text(), 'spa');
  assert.equal(await (await request('/api/mail/list')).text(), 'api');
});
