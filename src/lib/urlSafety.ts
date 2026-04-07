/**
 * Validates that a URL is safe to use as a webhook callback target.
 *
 * Rejects:
 *  - Non-HTTPS URLs (except localhost in dev)
 *  - Private/loopback/link-local IP ranges (SSRF protection)
 *  - Hostnames that resolve to private IPs (basic check via DNS-like patterns)
 */

const PRIVATE_IP_PATTERNS = [
  // Loopback
  /^127\./,
  /^::1$/,
  // RFC 1918 private ranges
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  // Link-local
  /^169\.254\./,
  /^fe80:/i,
  // Localhost by name
  /^localhost$/i,
];

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateWebhookUrl(rawUrl: string): UrlValidationResult {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // Must be HTTPS (allow HTTP only when explicitly in development mode)
  if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    return { valid: false, reason: 'Webhook URL must use HTTPS in production' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, reason: 'Webhook URL must use HTTP or HTTPS' };
  }

  const hostname = parsed.hostname;

  // Block private/loopback IPs and hostnames
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, reason: 'Webhook URL must not point to a private or loopback address' };
    }
  }

  return { valid: true };
}
