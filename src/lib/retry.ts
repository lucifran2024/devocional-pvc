/**
 * Retry utility for API calls with exponential backoff
 */
export interface RetryOptions {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: Error, attempt: number) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    shouldRetry: () => true,
};

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === opts.maxAttempts) {
                throw lastError;
            }

            if (!opts.shouldRetry(lastError, attempt)) {
                throw lastError;
            }

            // Exponential backoff with jitter
            const delay = Math.min(
                opts.baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500,
                opts.maxDelayMs
            );

            console.log(`🔄 Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError || new Error('Retry failed');
}

/**
 * Circuit Breaker for fault tolerance
 */
export class CircuitBreaker {
    private failures = 0;
    private lastFailure: number | null = null;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    constructor(
        private threshold: number = 5,
        private resetTimeoutMs: number = 60000
    ) { }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'OPEN') {
            if (Date.now() - (this.lastFailure || 0) > this.resetTimeoutMs) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN - service unavailable');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }

    private onFailure() {
        this.failures++;
        this.lastFailure = Date.now();

        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
            console.warn('⚠️ Circuit breaker OPEN - too many failures');
        }
    }

    getState() {
        return this.state;
    }
}
