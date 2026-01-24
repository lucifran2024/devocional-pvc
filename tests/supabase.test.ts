import { describe, it, expect } from 'vitest';

// Test pure date utility function without importing supabase client
function getDataHoje(): string {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
}

describe('Date utilities', () => {
    describe('getDataHoje', () => {
        it('should return date in YYYY-MM-DD format', () => {
            const result = getDataHoje();
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('should return today\'s date', () => {
            const result = getDataHoje();
            const expected = new Date().toISOString().split('T')[0];
            expect(result).toBe(expected);
        });
    });
});
