export type SyncAccountProblem = 'missing-email' | 'unverified-email' | 'non-google-provider';

export interface SyncAccountClaims {
  email: string | null | undefined;
  emailVerified: boolean;
  signInProvider: string | null | undefined;
}

/**
 * Mirrors the shared Firestore rule before Fare opens any private listeners.
 * The current token claim is authoritative. A linked Google identity cannot
 * prove which provider issued this session, so token inspection failures must
 * fail closed instead of opening Firestore with claims the rules will reject.
 */
export function syncAccountProblem(claims: SyncAccountClaims): SyncAccountProblem | null {
  if (!(claims.email ?? '').trim()) return 'missing-email';
  if (!claims.emailVerified) return 'unverified-email';
  return claims.signInProvider === 'google.com' ? null : 'non-google-provider';
}
