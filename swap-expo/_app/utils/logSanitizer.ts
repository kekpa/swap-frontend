/**
 * Log Sanitizer Utility
 *
 * Sanitizes objects before logging to prevent sensitive data exposure.
 * Use this when you need to log objects that might contain sensitive fields.
 *
 * NEVER log these values directly:
 * - Tokens (access, refresh, JWT)
 * - Passwords, PINs, OTPs
 * - API keys, secrets
 * - Full request/response bodies with auth data
 */

// Fields that should always be redacted
const SENSITIVE_KEYS = [
  'token',
  'access_token',
  'refresh_token',
  'accessToken',
  'refreshToken',
  'password',
  'pin',
  'otp',
  'code',
  'secret',
  'api_key',
  'apiKey',
  'authorization',
  'bearer',
  'credit_card',
  'creditCard',
];

/**
 * Sanitize an object for safe logging
 * Redacts any fields that match sensitive key patterns
 */
export function sanitizeForLog(obj: unknown, maxDepth = 3): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (maxDepth <= 0) {
    return '[Max depth reached]';
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForLog(item, maxDepth - 1));
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Check if key contains any sensitive pattern (case-insensitive)
    const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) =>
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLog(value, maxDepth - 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Safely stringify an object for logging
 * Includes sanitization and truncation
 */
export function safeStringify(obj: unknown, maxLength = 1000): string {
  try {
    const sanitized = sanitizeForLog(obj);
    const str = JSON.stringify(sanitized, null, 2);
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '... (truncated)';
    }
    return str;
  } catch (error) {
    return '[Stringify error]';
  }
}

/**
 * Check if a string looks like a token (JWT format)
 * Useful for additional validation before logging
 */
export function looksLikeToken(value: string): boolean {
  if (typeof value !== 'string') return false;
  // JWT format: header.payload.signature (base64 encoded parts separated by dots)
  const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
  return jwtPattern.test(value);
}

/**
 * Redact a token value, showing only a safe prefix
 */
export function redactToken(token: string): string {
  if (!token || typeof token !== 'string') return '[invalid]';
  if (token.length < 10) return '[short]';
  return `${token.substring(0, 6)}...[REDACTED]`;
}
