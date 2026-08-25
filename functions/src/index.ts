import { onRequest } from 'firebase-functions/v2/https';
import { handleFatSecretRequest } from './handler.js';

export const fatsecretSearch = onRequest(
  {
    cors: false,
    invoker: 'public',
    region: 'us-central1',
    secrets: ['FATSECRET_CONSUMER_KEY', 'FATSECRET_SHARED_SECRET'],
  },
  (req, res) => {
    const host = req.get('host') ?? 'us-central1-pickledgerpro.cloudfunctions.net';
    const path = req.originalUrl || req.url || '/';
    const proto = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const url = new URL(path, `${proto}://${host}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(', '));
    }
    const request = new Request(url, { method: req.method, headers });
    void handleFatSecretRequest(request, {
      consumerKey: process.env.FATSECRET_CONSUMER_KEY,
      sharedSecret: process.env.FATSECRET_SHARED_SECRET,
    }).then(async (response) => {
      res.status(response.status);
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.send(Buffer.from(await response.arrayBuffer()));
    }).catch(() => {
      res.status(500).json({ error: 'Proxy failed' });
    });
  },
);
