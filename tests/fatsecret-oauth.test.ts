import { describe, expect, it } from 'vitest';
import { percentEncode, signOAuth1Get } from '../functions/src/oauth1';

describe('FatSecret OAuth 1.0 signing', () => {
  it('percent-encodes apostrophes and spaces per RFC 3986', () => {
    expect(percentEncode("Domino's Pizza")).toBe("Domino%27s%20Pizza");
    expect(percentEncode('~._-')).toBe('~._-');
  });

  it('matches the dummy HMAC-SHA1 golden vector', async () => {
    const signed = await signOAuth1Get({
      url: 'https://platform.fatsecret.com/rest/server.api',
      params: {
        format: 'json',
        max_results: '5',
        method: 'foods.search',
        search_expression: "Domino's Pizza",
      },
      consumerKey: 'demo_consumer_key',
      consumerSecret: 'demo_shared_secret',
      nonce: 'abc123nonce',
      timestamp: '1700000000',
    });
    expect(signed.signature).toBe('3whdi5oi+WS0R+VnC7HZZBdqZeg=');
    expect(signed.paramString).toContain('search_expression=Domino%27s%20Pizza');
    expect(signed.baseString.startsWith('GET&https%3A%2F%2Fplatform.fatsecret.com%2Frest%2Fserver.api&')).toBe(true);
  });

  it('uses an empty token secret (consumer secret followed by &)', async () => {
    const signed = await signOAuth1Get({
      url: 'https://platform.fatsecret.com/rest/server.api',
      params: { method: 'foods.search', format: 'json', max_results: '5', search_expression: 'pizza' },
      consumerKey: 'demo_consumer_key',
      consumerSecret: 'demo_shared_secret',
      nonce: 'n',
      timestamp: '1',
    });
    const other = await signOAuth1Get({
      url: 'https://platform.fatsecret.com/rest/server.api',
      params: { method: 'foods.search', format: 'json', max_results: '5', search_expression: 'pizza' },
      consumerKey: 'demo_consumer_key',
      consumerSecret: 'demo_shared_secretX',
      nonce: 'n',
      timestamp: '1',
    });
    expect(signed.signature).not.toBe(other.signature);
  });

  it('changes the signature when a query param changes', async () => {
    const pizza = await signOAuth1Get({
      url: 'https://platform.fatsecret.com/rest/server.api',
      params: { method: 'foods.search', format: 'json', max_results: '5', search_expression: 'pizza' },
      consumerKey: 'demo_consumer_key',
      consumerSecret: 'demo_shared_secret',
      nonce: 'n',
      timestamp: '1',
    });
    const pasta = await signOAuth1Get({
      url: 'https://platform.fatsecret.com/rest/server.api',
      params: { method: 'foods.search', format: 'json', max_results: '5', search_expression: 'pasta' },
      consumerKey: 'demo_consumer_key',
      consumerSecret: 'demo_shared_secret',
      nonce: 'n',
      timestamp: '1',
    });
    expect(pizza.signature).not.toBe(pasta.signature);
  });
});
