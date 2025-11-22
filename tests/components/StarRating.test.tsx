import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StarRating, CompactStarRating, StarRatingDisplay } from '@/components/StarRating';
import type { SatisfactionRating } from '@/types/feedback';

describe('StarRating Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('StarRating', () => {
    it('renders 5 stars with correct initial state', () => {
      render(<StarRating value={0} onChange={mockOnChange} />);

      const stars = screen.getAllByRole('button');
      expect(stars).toHaveLength(5);

      stars.forEach(star => {
        expect(star).toHaveTextContent('☆');
      });
    });

    it('displays filled stars up to the current value', () => {
      render(<StarRating value={3} onChange={mockOnChange} />);

      const stars = screen.getAllByRole('button');

      // First 3 stars should be filled
      expect(stars[0]).toHaveTextContent('⭐');
      expect(stars[1]).toHaveTextContent('⭐');
      expect(stars[2]).toHaveTextContent('⭐');

      // Last 2 stars should be empty
      expect(stars[3]).toHaveTextContent('☆');
      expect(stars[4]).toHaveTextContent('☆');
    });

    it('calls onChange when star is clicked', () => {
      render(<StarRating value={0} onChange={mockOnChange} />);

      const stars = screen.getAllByRole('button');
      fireEvent.click(stars[2]); // Click 3rd star

      expect(mockOnChange).toHaveBeenCalledWith(3);
    });

    it('shows hover effect on mouse enter', async () => {
      render(<StarRating value={0} onChange={mockOnChange} />);

      const stars = screen.getAllByRole('button');
      fireEvent.mouseEnter(stars[2]); // Hover over 3rd star

      await waitFor(() => {
        expect(stars[0]).toHaveTextContent('⭐');
        expect(stars[1]).toHaveTextContent('⭐');
        expect(stars[2]).toHaveTextContent('⭐');
      });
    });

    it('shows rating text when value is set', () => {
      render(<StarRating value={4} onChange={mockOnChange} />);

      expect(screen.getByText('ดี')).toBeInTheDocument();
      expect(screen.getByText('4 จาก 5 ดาว')).toBeInTheDocument();
    });

    it('respects disabled state', () => {
      render(<StarRating value={0} onChange={mockOnChange} disabled />);

      const stars = screen.getAllByRole('button');
      fireEvent.click(stars[2]);

      expect(mockOnChange).not.toHaveBeenCalled();

      stars.forEach(star => {
        expect(star).toBeDisabled();
      });
    });

    it('renders different sizes correctly', () => {
      const { rerender } = render(<StarRating value={3} onChange={mockOnChange} size="small" />);
      let container = screen.getByRole('button').parentElement?.parentElement;
      expect(container).toHaveClass('gap-1');

      rerender(<StarRating value={3} onChange={mockOnChange} size="large" />);
      container = screen.getByRole('button').parentElement?.parentElement;
      expect(container).toHaveClass('gap-3');
    });

    it('has proper accessibility attributes', () => {
      render(<StarRating value={2} onChange={mockOnChange} />);

      const stars = screen.getAllByRole('button');
      expect(stars[0]).toHaveAttribute('aria-label', 'Rate 1 star');
      expect(stars[4]).toHaveAttribute('aria-label', 'Rate 5 stars');
    });
  });

  describe('CompactStarRating', () => {
    it('renders compact version with label', () => {
      render(<CompactStarRating value={3} onChange={mockOnChange} />);

      expect(screen.getByText('ความพอใจ:')).toBeInTheDocument();
      expect(screen.getByText('(3/5)')).toBeInTheDocument();
    });

    it('handles star clicks in compact mode', () => {
      render(<CompactStarRating value={0} onChange={mockOnChange} />);

      const stars = screen.getAllByRole('button');
      fireEvent.click(stars[3]);

      expect(mockOnChange).toHaveBeenCalledWith(4);
    });
  });

  describe('StarRatingDisplay', () => {
    it('renders read-only display with label', () => {
      render(<StarRatingDisplay value={4} showLabel />);

      expect(screen.getByText('ดี')).toBeInTheDocument();
      expect(screen.getByText('(4/5)')).toBeInTheDocument();

      // Should not have clickable buttons
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('hides label when showLabel is false', () => {
      render(<StarRatingDisplay value={4} showLabel={false} />);

      expect(screen.queryByText('ดี')).not.toBeInTheDocument();
      expect(screen.queryByText('(4/5)')).not.toBeInTheDocument();
    });

    it('displays correct number of filled stars', () => {
      render(<StarRatingDisplay value={3} />);

      const starContainer = screen.getByRole('generic');
      const filledStars = starContainer.querySelectorAll('span').length;
      expect(filledStars).toBe(5); // 5 total stars rendered
    });
  });

  describe('Rating Text Mapping', () => {
    const ratingTexts: Array<[SatisfactionRating, string]> = [
      [1, 'แย่มาก'],
      [2, 'แย่'],
      [3, 'ปานกลาง'],
      [4, 'ดี'],
      [5, 'ดีเยี่ยม']
    ];

    it.each(ratingTexts)('displays correct text for rating %i', (rating, expectedText) => {
      render(<StarRating value={rating} onChange={mockOnChange} />);
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  });
});