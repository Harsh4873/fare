import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { handleFatSecretRequest } from './handler.js';

initializeApp();

const consumerKey = defineSecret('FATSECRET_CONSUMER_KEY');
const sharedSecret = defineSecret('FATSECRET_SHARED_SECRET');

function isOwnerMembership(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.schemaVersion === 1
    && candidate.status === 'active'
    && typeof candidate.vaultId === 'string'
    && /^[A-Za-z0-9_-]{12,128}$/.test(candidate.vaultId);
}

async function callerIsOwner(token: string): Promise<boolean> {
  try {
    const decoded = await getAuth().verifyIdToken(token);
    if (decoded.firebase.sign_in_provider !== 'google.com' || decoded.email_verified !== true) {
      return false;
    }
    const snapshot = await getFirestore().doc(`owner_vault_members/${decoded.uid}`).get();
    return isOwnerMembership(snapshot.data());
  } catch {
    return false;
  }
}

export const fatsecretSearch = onRequest(
  {
    cors: false,
    invoker: 'public',
    region: 'us-central1',
    secrets: [consumerKey, sharedSecret],
    maxInstances: 2,
    timeoutSeconds: 20,
    memory: '256MiB',
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
      consumerKey: consumerKey.value(),
      sharedSecret: sharedSecret.value(),
      requireAuth: true,
      verifyIdToken: callerIsOwner,
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
