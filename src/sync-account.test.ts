import { describe, expect, it } from 'vitest';
import { syncAccountProblem } from './sync-account';

const verifiedGoogle = {
  email: 'owner@example.test',
  emailVerified: true,
  signInProvider: 'google.com',
};

describe('Fare sync account eligibility', () => {
  it('accepts the same verified Google session the rules accept', () => {
    expect(syncAccountProblem(verifiedGoogle)).toBeNull();
  });

  it('rejects missing and unverified email claims', () => {
    expect(syncAccountProblem({ ...verifiedGoogle, email: null })).toBe('missing-email');
    expect(syncAccountProblem({ ...verifiedGoogle, emailVerified: false })).toBe('unverified-email');
  });

  it('uses the token provider rather than a merely linked Google identity', () => {
    expect(syncAccountProblem({ ...verifiedGoogle, signInProvider: 'password' }))
      .toBe('non-google-provider');
  });

  it('fails closed when the token provider cannot be inspected', () => {
    expect(syncAccountProblem({ ...verifiedGoogle, signInProvider: undefined }))
      .toBe('non-google-provider');
    expect(syncAccountProblem({ ...verifiedGoogle, signInProvider: null }))
      .toBe('non-google-provider');
  });
});
