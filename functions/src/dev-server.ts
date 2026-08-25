import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleFatSecretRequest } from './handler.js';

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const here = dirname(fileURLToPath(import.meta.url));
loadEnvFile(resolve(homedir(), '.config/fare/fatsecret.env'));
loadEnvFile(resolve(here, '../.env'));
loadEnvFile(resolve(here, '../../.env'));

const port = Number(process.env.PORT ?? 8788);

createServer((req, res) => {
  const host = req.headers.host ?? `127.0.0.1:${port}`;
  const url = new URL(req.url ?? '/', `http://${host}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  const request = new Request(url, { method: req.method, headers });
  void handleFatSecretRequest(request, {
    consumerKey: process.env.FATSECRET_CONSUMER_KEY,
    sharedSecret: process.env.FATSECRET_SHARED_SECRET,
  }).then(async (response) => {
    const out: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      out[key] = value;
    });
    res.writeHead(response.status, out);
    res.end(Buffer.from(await response.arrayBuffer()));
  }).catch(() => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy failed' }));
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`FatSecret proxy listening on http://127.0.0.1:${port}`);
});
