import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// Mock do fetch global
global.fetch = vi.fn();

// Reset dos mocks antes de cada teste
beforeEach(() => {
    vi.clearAllMocks();
});
