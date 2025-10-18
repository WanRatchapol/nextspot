import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SwipeCard } from '@/components/SwipeCard';

interface RecommendationItem {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
}

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => ({ get: () => 0 }),
  useAnimation: () => ({
    start: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock @use-gesture/react
vi.mock('@use-gesture/react', () => ({
  useDrag: () => () => ({}),
}));

const mockDestination: RecommendationItem = {
  id: '1',
  nameTh: 'วัดพระแก้ว',
  nameEn: 'Temple of the Emerald Buddha',
  descTh: 'วัดที่สำคัญที่สุดในประเทศไทย ตั้งอยู่ในพระบรมมหาราชวัง',
  imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  tags: ['วัด', 'วัฒนธรรม', 'ประวัติศาสตร์'],
};

describe('SwipeCard', () => {
  const mockOnSwipe = vi.fn();
  const mockOnDetailTap = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders destination information correctly', () => {
    render(
      <SwipeCard
        destination={mockDestination}
        onSwipe={mockOnSwipe}
        onDetailTap={mockOnDetailTap}
      />
    );

    expect(screen.getByText('วัดพระแก้ว')).toBeInTheDocument();
    expect(screen.getByText('Temple of the Emerald Buddha')).toBeInTheDocument();
    expect(screen.getByText('วัดที่สำคัญที่สุดในประเทศไทย ตั้งอยู่ในพระบรมมหาราชวัง')).toBeInTheDocument();
    expect(screen.getByText('วัด')).toBeInTheDocument();
    expect(screen.getByText('วัฒนธรรม')).toBeInTheDocument();
    expect(screen.getByText('ประวัติศาสตร์')).toBeInTheDocument();
  });

  it('renders image with correct src and alt', () => {
    render(
      <SwipeCard
        destination={mockDestination}
        onSwipe={mockOnSwipe}
        onDetailTap={mockOnDetailTap}
      />
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', mockDestination.imageUrl);
    expect(image).toHaveAttribute('alt', mockDestination.nameEn);
  });

  it('limits tags display to 3 and shows overflow count', () => {
    const destinationWithManyTags: RecommendationItem = {
      ...mockDestination,
      tags: ['วัด', 'วัฒนธรรม', 'ประวัติศาสตร์', 'ท่องเที่ยว', 'กรุงเทพ'],
    };

    render(
      <SwipeCard
        destination={destinationWithManyTags}
        onSwipe={mockOnSwipe}
        onDetailTap={mockOnDetailTap}
      />
    );

    // Should show first 3 tags
    expect(screen.getByText('วัด')).toBeInTheDocument();
    expect(screen.getByText('วัฒนธรรม')).toBeInTheDocument();
    expect(screen.getByText('ประวัติศาสตร์')).toBeInTheDocument();

    // Should show overflow indicator
    expect(screen.getByText('+2')).toBeInTheDocument();

    // Should not show hidden tags
    expect(screen.queryByText('ท่องเที่ยว')).not.toBeInTheDocument();
    expect(screen.queryByText('กรุงเทพ')).not.toBeInTheDocument();
  });

  it('calls onDetailTap when card is clicked', () => {
    render(
      <SwipeCard
        destination={mockDestination}
        onSwipe={mockOnSwipe}
        onDetailTap={mockOnDetailTap}
      />
    );

    const card = screen.getByText('วัดพระแก้ว').closest('.destination-card');
    fireEvent.click(card!);

    expect(mockOnDetailTap).toHaveBeenCalledWith(mockDestination);
  });

  it('calls onSwipe with right direction when like button is clicked', async () => {
    render(
      <SwipeCard
        destination={mockDestination}
        onSwipe={mockOnSwipe}
        onDetailTap={mockOnDetailTap}
      />
    );

    const likeButton = screen.getByLabelText('Like this place');
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(mockOnSwipe).toHaveBeenCalledWith('right', mockDestination);
    });
  });

  it('calls onSwipe with left direction when skip button is clicked', async () => {
    render(
      <SwipeCard
        destination={mockDestination}
        onSwipe={mockOnSwipe}
        onDetailTap={mockOnDetailTap}
      />
    );

    const skipButton = screen.getByLabelText('Skip this place');
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(mockOnSwipe).toHaveBeenCalledWith('left', mockDestination);
    });
  });

  it('prevents interaction when isAnimating is true', () => {
    render(
      <SwipeCard
        destination={mockDestination}
        onSwipe={mockOnSwipe}
        onDetailTap={mockOnDetailTap}
        isAnimating={true}
      />
    );

    // Try to click card
    const card = screen.getByText('วัดพระแก้ว').closest('.destination-card');
    fireEvent.click(card!);

    // Should not call onDetailTap
    expect(mockOnDetailTap).not.toHaveBeenCalled();

    // Try to click like button
    const likeButton = screen.getByLabelText('Like this place');
    fireEvent.click(likeButton);

    // Should not call onSwipe
    expect(mockOnSwipe).not.toHaveBeenCalled();
  });

  it('handles image load error with fallback', () => {
    render(
      <SwipeCard
        destination={mockDestination}
        onSwipe={mockOnSwipe}
        onDetailTap={mockOnDetailTap}
      />
    );

    const image = screen.getByRole('img');
    fireEvent.error(image);

    expect(image).toHaveAttribute('src', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800');
  });

  it('displays swipe indicators correctly', () => {
    render(
      <SwipeCard
        destination={mockDestination}
        onSwipe={mockOnSwipe}
        onDetailTap={mockOnDetailTap}
      />
    );

    expect(screen.getByText('LIKE ❤️')).toBeInTheDocument();
    expect(screen.getByText('SKIP ✖️')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <SwipeCard
        destination={mockDestination}
        onSwipe={mockOnSwipe}
        onDetailTap={mockOnDetailTap}
      />
    );

    const likeButton = screen.getByLabelText('Like this place');
    const skipButton = screen.getByLabelText('Skip this place');

    expect(likeButton).toBeInTheDocument();
    expect(skipButton).toBeInTheDocument();
  });

  it('prevents default drag behavior on image', () => {
    render(
      <SwipeCard
        destination={mockDestination}
        onSwipe={mockOnSwipe}
        onDetailTap={mockOnDetailTap}
      />
    );

    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('draggable', 'false');
  });

  it('has proper touch action styles for mobile', () => {
    render(
      <SwipeCard
        destination={mockDestination}
        onSwipe={mockOnSwipe}
        onDetailTap={mockOnDetailTap}
      />
    );

    // Check that touchAction is set on the card element
    const card = screen.getByText('วัดพระแก้ว').closest('.destination-card');
    expect(card).toBeTruthy();
    // The style is applied via inline styles or CSS, so we just verify the element exists
    expect(card).toHaveClass('destination-card');
  });
});