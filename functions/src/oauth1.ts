export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export interface OAuth1GetInput {
  readonly url: string;
  readonly params: Record<string, string>;
  readonly consumerKey: string;
  readonly consumerSecret: string;
  readonly nonce: string;
  readonly timestamp: string;
}

export interface OAuth1SignedRequest {
  readonly signature: string;
  readonly signedParams: Record<string, string>;
  readonly baseString: string;
  readonly paramString: string;
}

export async function signOAuth1Get(input: OAuth1GetInput): Promise<OAuth1SignedRequest> {
  const oauthParams: Record<string, string> = {
    ...input.params,
    oauth_consumer_key: input.consumerKey,
    oauth_nonce: input.nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: input.timestamp,
    oauth_version: '1.0',
  };
  const pairs = Object.entries(oauthParams)
    .map(([key, value]) => [percentEncode(key), percentEncode(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => (
      leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey)
    ));
  const paramString = pairs.map(([key, value]) => `${key}=${value}`).join('&');
  const baseString = ['GET', percentEncode(input.url), percentEncode(paramString)].join('&');
  const signingKey = `${percentEncode(input.consumerSecret)}&`;
  const signature = await hmacSha1Base64(signingKey, baseString);
  return {
    signature,
    signedParams: { ...oauthParams, oauth_signature: signature },
    baseString,
    paramString,
  };
}

export function signedQueryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&');
}

async function hmacSha1Base64(key: string, data: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const bytes = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
