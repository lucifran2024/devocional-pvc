import { describe, it, expect, vi } from 'vitest';
import { withRetry, CircuitBreaker } from '@/lib/retry';

describe('Retry Utility', () => {
    describe('withRetry', () => {
        it('should return result on first success', async () => {
            const fn = vi.fn().mockResolvedValue('success');
            const result = await withRetry(fn);
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should retry on failure', async () => {
            const fn = vi.fn()
                .mockRejectedValueOnce(new Error('fail1'))
                .mockResolvedValue('success');

            const result = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 });
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should throw after max attempts', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('always fails'));

            await expect(
                withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })
            ).rejects.toThrow('always fails');

            expect(fn).toHaveBeenCalledTimes(3);
        });
    });

    describe('CircuitBreaker', () => {
        it('should start CLOSED', () => {
            const breaker = new CircuitBreaker(3, 1000);
            expect(breaker.getState()).toBe('CLOSED');
        });

        it('should open after threshold failures', async () => {
            const breaker = new CircuitBreaker(3, 1000);
            const failingFn = () => Promise.reject(new Error('fail'));

            for (let i = 0; i < 3; i++) {
                try {
                    await breaker.execute(failingFn);
                } catch {
                    // expected
                }
            }

            expect(breaker.getState()).toBe('OPEN');
        });

        it('should reject when OPEN', async () => {
            const breaker = new CircuitBreaker(1, 10000);
            const failingFn = () => Promise.reject(new Error('fail'));

            try {
                await breaker.execute(failingFn);
            } catch {
                // expected - opens the breaker
            }

            await expect(
                breaker.execute(() => Promise.resolve('test'))
            ).rejects.toThrow('Circuit breaker is OPEN');
        });
    });
});
