import '@testing-library/jest-dom';

// Mock do fetch global
global.fetch = vi.fn();

// Reset dos mocks antes de cada teste
beforeEach(() => {
    vi.clearAllMocks();
});
