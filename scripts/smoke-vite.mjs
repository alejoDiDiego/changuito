import assert from 'node:assert/strict';

// Explicit startup smoke only: caller owns and starts Compose Vite first.
for (const origin of ['http://127.0.0.1:8000', 'http://127.0.0.1:18080']) {
  for (const route of ['/@vite/client', '/resources/js/app.tsx']) {
    const response = await fetch(`http://127.0.0.1:5173${route}`, {
      headers: { Origin: origin }, signal: AbortSignal.timeout(30_000),
    });
    assert.equal(response.status, 200, route);
    assert.equal(response.headers.get('access-control-allow-origin'), origin, `CORS ${origin} ${route}`);
    await response.text();
    console.log(`VITE: 200 and matching CORS for ${origin} ${route}`);
  }
}
const denied = await fetch('http://127.0.0.1:5173/@vite/client', {
  headers: { Origin: 'http://untrusted.invalid' }, signal: AbortSignal.timeout(30_000),
});
assert.equal(denied.headers.get('access-control-allow-origin'), null, 'Untrusted origin must not be allowed');
await denied.text();
console.log('VITE: untrusted origin rejected');
