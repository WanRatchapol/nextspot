// Tests for LikedCounter components
// S-09 Liked List & Completion feature

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LikedCounter, AnimatedLikedCounter, CompactLikedCounter, BadgeLikedCounter } from '@/components/LikedCounter';

describe('LikedCounter', () => {
  describe('LikedCounter', () => {
    it('should render with correct count and Thai text', () => {
      render(<LikedCounter count={3} />);

      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('ถูกใจ 3 ที่')).toBeInTheDocument();
    });

    it('should render with zero count', () => {
      render(<LikedCounter count={0} />);

      expect(screen.getByText('ถูกใจ 0 ที่')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<LikedCounter count={1} className="custom-class" />);

      const container = screen.getByText('ถูกใจ 1 ที่').closest('div');
      expect(container).toHaveClass('custom-class');
    });

    it('should handle large numbers', () => {
      render(<LikedCounter count={999} />);

      expect(screen.getByText('ถูกใจ 999 ที่')).toBeInTheDocument();
    });
  });

  describe('AnimatedLikedCounter', () => {
    it('should render with correct count', () => {
      render(<AnimatedLikedCounter count={5} />);

      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('ถูกใจ 5 ที่')).toBeInTheDocument();
    });

    it('should re-render when count changes', () => {
      const { rerender } = render(<AnimatedLikedCounter count={1} />);

      expect(screen.getByText('ถูกใจ 1 ที่')).toBeInTheDocument();

      rerender(<AnimatedLikedCounter count={2} />);
      expect(screen.getByText('ถูกใจ 2 ที่')).toBeInTheDocument();
    });
  });

  describe('CompactLikedCounter', () => {
    it('should render compact version', () => {
      render(<CompactLikedCounter count={7} />);

      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('should render with zero count', () => {
      render(<CompactLikedCounter count={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<CompactLikedCounter count={1} className="compact-custom" />);

      const container = screen.getByText('1').closest('div');
      expect(container).toHaveClass('compact-custom');
    });
  });

  describe('BadgeLikedCounter', () => {
    it('should render badge when count is greater than 0', () => {
      render(<BadgeLikedCounter count={4} />);

      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('ถูกใจ 4 ที่')).toBeInTheDocument();
    });

    it('should not render when count is 0', () => {
      const { container } = render(<BadgeLikedCounter count={0} />);

      expect(container.firstChild).toBeNull();
    });

    it('should apply badge styling', () => {
      render(<BadgeLikedCounter count={1} />);

      const badge = screen.getByText('ถูกใจ 1 ที่').closest('div');
      expect(badge).toHaveClass('bg-red-100', 'text-red-700', 'rounded-full');
    });

    it('should apply custom className when provided', () => {
      render(<BadgeLikedCounter count={1} className="badge-custom" />);

      const badge = screen.getByText('ถูกใจ 1 ที่').closest('div');
      expect(badge).toHaveClass('badge-custom');
    });
  });

  describe('Accessibility', () => {
    it('should have readable text content', () => {
      render(<LikedCounter count={3} />);

      // Check that the text is accessible to screen readers
      expect(screen.getByText('ถูกใจ 3 ที่')).toBeInTheDocument();
    });

    it('should maintain semantic structure', () => {
      render(<LikedCounter count={1} />);

      const container = screen.getByText('ถูกใจ 1 ที่').closest('div');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative counts gracefully', () => {
      render(<LikedCounter count={-1} />);

      expect(screen.getByText('ถูกใจ -1 ที่')).toBeInTheDocument();
    });

    it('should handle very large counts', () => {
      render(<LikedCounter count={1000000} />);

      expect(screen.getByText('ถูกใจ 1000000 ที่')).toBeInTheDocument();
    });

    it('should handle decimal counts', () => {
      render(<LikedCounter count={2.5} />);

      expect(screen.getByText('ถูกใจ 2.5 ที่')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly with reasonable counts', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        const { unmount } = render(<LikedCounter count={i} />);
        unmount();
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});