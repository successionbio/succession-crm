import { getURLSafely } from '@/utils/getURLSafely';
import { isDefined } from '@/utils/validation';

// Lowercases the URL origin (scheme + host) and removes a trailing slash.
// Preserves the raw path, query, and hash without decoding percent-encoded sequences.
export const normalizeUrlOrigin = (rawUrl: string) => {
  const url = getURLSafely(rawUrl);

  if (!isDefined(url)) {
    return rawUrl;
  }

  const lowercaseOrigin = url.origin.toLowerCase();
  const rawOrigin = rawUrl.match(/^[a-zA-Z][a-zA-Z\d+.-]*:\/\/[^/?#]+/)?.[0];
  const path = isDefined(rawOrigin)
    ? rawUrl.slice(rawOrigin.length)
    : url.pathname + url.search + url.hash;

  return (lowercaseOrigin + path).replace(/\/$/, '');
};
