/**
 * Rate-limit check hook. No-op in MVP; plug in real limiting (Upstash, Redis, etc.) here.
 * Throw an error to block the action; return void to allow it.
 */
export async function checkRateLimit(_ctx) {
    // No-op — extend for production rate limiting
}
