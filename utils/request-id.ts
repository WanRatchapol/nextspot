/**
 * Generate a unique request ID for API calls and analytics tracking
 * Uses a simple UUID-like format for MVP
 */
export function generateRequestId(): string {
  // Simple UUID v4 implementation for browser
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  // Fallback for older browsers or server-side
  return 'req-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Generate a UUIDv7-like session ID
 * Format: sess_<timestamp>_<random> for better database performance
 */
export function generateSessionId(): string {
  const timestamp = Date.now();
  const timestampHex = timestamp.toString(16).padStart(12, '0');

  // Generate random bytes for the rest of the UUID
  let random = '';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const randomBytes = new Uint8Array(10);
    window.crypto.getRandomValues(randomBytes);
    random = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Fallback for server-side
    for (let i = 0; i < 20; i++) {
      random += Math.floor(Math.random() * 16).toString(16);
    }
  }

  return `sess_${timestampHex}_${random}`;
}