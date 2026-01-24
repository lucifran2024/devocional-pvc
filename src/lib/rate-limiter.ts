/**
 * Rate limiter for API calls
 * Uses sliding window algorithm
 */
export class RateLimiter {
    private requests: number[] = [];

    constructor(
        private maxRequests: number = 10,
        private windowMs: number = 60000
    ) { }

    canMakeRequest(): boolean {
        this.cleanup();
        return this.requests.length < this.maxRequests;
    }

    recordRequest(): void {
        this.cleanup();
        this.requests.push(Date.now());
    }

    private cleanup(): void {
        const cutoff = Date.now() - this.windowMs;
        this.requests = this.requests.filter(time => time > cutoff);
    }

    getRemainingRequests(): number {
        this.cleanup();
        return Math.max(0, this.maxRequests - this.requests.length);
    }

    getResetTime(): number {
        if (this.requests.length === 0) return 0;
        return this.requests[0] + this.windowMs - Date.now();
    }
}

// Singleton for global rate limiting
let globalRateLimiter: RateLimiter | null = null;

export function getGlobalRateLimiter(): RateLimiter {
    if (!globalRateLimiter) {
        globalRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
    }
    return globalRateLimiter;
}

export function checkRateLimit(): { allowed: boolean; remaining: number; resetIn: number } {
    const limiter = getGlobalRateLimiter();
    return {
        allowed: limiter.canMakeRequest(),
        remaining: limiter.getRemainingRequests(),
        resetIn: limiter.getResetTime(),
    };
}
