import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ThemeProvider } from '../../src/components/ThemeProvider';
import { ThemeToggle } from '../../src/components/ui/ThemeToggle';
beforeEach(() => {
  localStorage.clear();
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(cleanup);
describe('Theme controls', () => {
  it('switches from system dark to light, persists and returns to dark', () => {
    render(<ThemeProvider defaultTheme="system" storageKey="devocional-theme"><ThemeToggle /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', {name:'Ativar modo claro'}));
    expect(document.documentElement).toHaveClass('light');
    expect(localStorage.getItem('devocional-theme')).toBe('light');
    fireEvent.click(screen.getByRole('button', {name:'Ativar modo noturno'}));
    expect(document.documentElement).toHaveClass('dark');
  });
  it('restores an existing light preference', () => {
    localStorage.setItem('devocional-theme', 'light');
    render(<ThemeProvider defaultTheme="dark" storageKey="devocional-theme"><ThemeToggle /></ThemeProvider>);
    expect(screen.getByRole('button', {name:'Ativar modo noturno'})).toBeVisible();
    expect(document.documentElement).toHaveClass('light');
  });
});
