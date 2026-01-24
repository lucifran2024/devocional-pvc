import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, CardSkeleton, HeroSkeleton } from '@/components/ui/Skeleton';

describe('Skeleton Components', () => {
    describe('Skeleton', () => {
        it('renders with default classes', () => {
            render(<Skeleton />);
            const skeleton = document.querySelector('.animate-pulse');
            expect(skeleton).toBeInTheDocument();
        });

        it('accepts custom className', () => {
            render(<Skeleton className="h-10 w-full" />);
            const skeleton = document.querySelector('.h-10');
            expect(skeleton).toBeInTheDocument();
        });
    });

    describe('CardSkeleton', () => {
        it('renders card skeleton structure', () => {
            render(<CardSkeleton />);
            const skeletons = document.querySelectorAll('.animate-pulse');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });

    describe('HeroSkeleton', () => {
        it('renders hero skeleton structure', () => {
            render(<HeroSkeleton />);
            const skeletons = document.querySelectorAll('.animate-pulse');
            expect(skeletons.length).toBeGreaterThan(0);
        });
    });
});
