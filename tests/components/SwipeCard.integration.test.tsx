import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SwipeCard } from '@/components/SwipeCard';
import { swipeTracker } from '@/utils/swipe-tracker';

// Mock the swipe tracker
vi.mock('@/utils/swipe-tracker', () => ({
  swipeTracker: {
    setSessionId: vi.fn(),
    recordSwipe: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock framer-motion for simpler testing
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, animate, style, className, ...props }: any) => (
      <div
        {...props}
        style={style}
        className={className}
        data-testid={className?.includes('absolute inset-0') ? 'main-motion-div' : 'motion-div'}
      >
        {children}
      </div>
    ),
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
  useTransform: () => ({ get: () => 0 }),
  useAnimation: () => ({
    start: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock @use-gesture/react
vi.mock('@use-gesture/react', () => ({
  useDrag: (handler: any, config: any) => {
    return () => ({
      onMouseDown: (e: any) => {
        // Simulate drag start
        handler({
          down: true,
          movement: [0, 0],
          velocity: [0, 0],
          direction: [1, 0],
          first: true,
          last: false
        });
      },
      onMouseUp: (e: any) => {
        // Simulate drag end with right swipe
        handler({
          down: false,
          movement: [150, 0], // Above threshold
          velocity: [2, 0],
          direction: [1, 0],
          first: false,
          last: true
        });
      }
    });
  },
}));

const mockDestination = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  nameTh: 'วัดพระแก้ว',
  nameEn: 'Temple of the Emerald Buddha',
  descTh: 'วัดที่สำคัญที่สุดในประเทศไทย ตั้งอยู่ในพระบรมมหาราชวัง',
  imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  tags: ['วัด', 'วัฒนธรรม', 'ประวัติศาสตร์'],
};

describe('SwipeCard Integration', () => {
  const mockOnSwipe = vi.fn();
  const mockOnDetailTap = vi.fn();
  const sessionId = '987fcdeb-51a2-43e5-a123-987654321000';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date.now for consistent timing
    vi.spyOn(Date, 'now').mockReturnValue(1640995200000);
  });

  // Helper to access mocked functions
  const getMockedSwipeTracker = () => swipeTracker as any;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Analytics Integration', () => {
    it('should set session ID when provided', () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      expect(getMockedSwipeTracker().setSessionId).toHaveBeenCalledWith(sessionId);
    });

    it('should not call setSessionId when sessionId is not provided', () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
        />
      );

      expect(getMockedSwipeTracker().setSessionId).not.toHaveBeenCalled();
    });

    it('should track detail tap events', async () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      const card = screen.getByText('วัดพระแก้ว').closest('.destination-card');
      fireEvent.click(card!);

      await waitFor(() => {
        expect(getMockedSwipeTracker().recordSwipe).toHaveBeenCalledWith({
          destinationId: mockDestination.id,
          action: 'detail_tap',
          direction: 'tap',
          viewDurationMs: expect.any(Number)
        });
      });

      expect(mockOnDetailTap).toHaveBeenCalledWith(mockDestination);
    });

    it('should track like button clicks', async () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      const likeButton = screen.getByLabelText('Like this place');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(getMockedSwipeTracker().recordSwipe).toHaveBeenCalledWith({
          destinationId: mockDestination.id,
          action: 'like',
          direction: 'right',
          durationMs: 0,
          viewDurationMs: expect.any(Number)
        });
      });

      expect(mockOnSwipe).toHaveBeenCalledWith('right', mockDestination);
    });

    it('should track skip button clicks', async () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      const skipButton = screen.getByLabelText('Skip this place');
      fireEvent.click(skipButton);

      await waitFor(() => {
        expect(getMockedSwipeTracker().recordSwipe).toHaveBeenCalledWith({
          destinationId: mockDestination.id,
          action: 'skip',
          direction: 'left',
          durationMs: 0,
          viewDurationMs: expect.any(Number)
        });
      });

      expect(mockOnSwipe).toHaveBeenCalledWith('left', mockDestination);
    });

    it('should not track events when no session ID is provided', async () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
        />
      );

      const likeButton = screen.getByLabelText('Like this place');
      fireEvent.click(likeButton);

      // Wait for any potential async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(getMockedSwipeTracker().recordSwipe).not.toHaveBeenCalled();
      expect(mockOnSwipe).toHaveBeenCalledWith('right', mockDestination);
    });

    it('should handle analytics errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      getMockedSwipeTracker().recordSwipe.mockRejectedValue(new Error('Network error'));

      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      const likeButton = screen.getByLabelText('Like this place');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[SwipeCard] Failed to track swipe event:',
          expect.any(Error)
        );
      });

      // Should still call the onSwipe callback
      expect(mockOnSwipe).toHaveBeenCalledWith('right', mockDestination);

      consoleSpy.mockRestore();
    });

    it('should calculate view duration correctly', async () => {
      // Mock initial time
      const startTime = 1640995200000;
      let currentTime = startTime;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      // Simulate time passing
      currentTime = startTime + 5000; // 5 seconds
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const likeButton = screen.getByLabelText('Like this place');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(getMockedSwipeTracker().recordSwipe).toHaveBeenCalledWith({
          destinationId: mockDestination.id,
          action: 'like',
          direction: 'right',
          durationMs: 0,
          viewDurationMs: 5000
        });
      });
    });
  });

  describe('Gesture Tracking', () => {
    it('should track gesture metrics for swipe gestures', async () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      const motionDiv = screen.getByTestId('main-motion-div');

      // Simulate gesture start
      fireEvent.mouseDown(motionDiv);

      // Mock time for gesture duration
      let gestureStartTime = 1640995200000;
      vi.spyOn(Date, 'now').mockReturnValue(gestureStartTime);

      // Simulate gesture end after 250ms
      gestureStartTime += 250;
      vi.spyOn(Date, 'now').mockReturnValue(gestureStartTime);

      fireEvent.mouseUp(motionDiv);

      await waitFor(() => {
        expect(getMockedSwipeTracker().recordSwipe).toHaveBeenCalledWith({
          destinationId: mockDestination.id,
          action: 'like',
          direction: 'right',
          velocity: 2, // From mocked gesture velocity
          durationMs: 250,
          viewDurationMs: expect.any(Number)
        });
      });
    });

    it('should not track events when animating', async () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
          isAnimating={true}
        />
      );

      const likeButton = screen.getByLabelText('Like this place');
      fireEvent.click(likeButton);

      // Wait for any potential async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(getMockedSwipeTracker().recordSwipe).not.toHaveBeenCalled();
      expect(mockOnSwipe).not.toHaveBeenCalled();
    });

    it('should not track detail tap when dragging', async () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      // Start a drag gesture
      const motionDiv = screen.getByTestId('main-motion-div');
      fireEvent.mouseDown(motionDiv);

      // Try to tap the card while dragging
      const card = screen.getByText('วัดพระแก้ว').closest('.destination-card');
      fireEvent.click(card!);

      // Wait for any potential async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockOnDetailTap).not.toHaveBeenCalled();
      expect(getMockedSwipeTracker().recordSwipe).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility and Fallback Controls', () => {
    it('should provide accessible button controls', () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      const likeButton = screen.getByLabelText('Like this place');
      const skipButton = screen.getByLabelText('Skip this place');

      expect(likeButton).toBeInTheDocument();
      expect(skipButton).toBeInTheDocument();

      // Check minimum touch target size
      const likeStyle = window.getComputedStyle(likeButton);
      const skipStyle = window.getComputedStyle(skipButton);

      expect(likeButton).toHaveStyle({ minHeight: '44px', minWidth: '44px' });
      expect(skipButton).toHaveStyle({ minHeight: '44px', minWidth: '44px' });
    });

    it('should prevent default drag behavior on images', () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('draggable', 'false');
    });

    it('should use touch action for mobile optimization', () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      const card = screen.getByText('วัดพระแก้ว').closest('.destination-card');
      expect(card).toHaveStyle({ touchAction: 'pan-x' });
    });
  });

  describe('Content Rendering', () => {
    it('should render destination information correctly', () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      expect(screen.getByText('วัดพระแก้ว')).toBeInTheDocument();
      expect(screen.getByText('Temple of the Emerald Buddha')).toBeInTheDocument();
      expect(screen.getByText('วัดที่สำคัญที่สุดในประเทศไทย ตั้งอยู่ในพระบรมมหาราชวัง')).toBeInTheDocument();
      expect(screen.getByText('วัด')).toBeInTheDocument();
      expect(screen.getByText('วัฒนธรรม')).toBeInTheDocument();
      expect(screen.getByText('ประวัติศาสตร์')).toBeInTheDocument();
    });

    it('should limit tags display to 3 and show overflow count', () => {
      const destinationWithManyTags = {
        ...mockDestination,
        tags: ['วัด', 'วัฒนธรรม', 'ประวัติศาสตร์', 'ท่องเที่ยว', 'กรุงเทพ'],
      };

      render(
        <SwipeCard
          destination={destinationWithManyTags}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
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

    it('should handle image load error with fallback', () => {
      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      const image = screen.getByRole('img');
      fireEvent.error(image);

      expect(image).toHaveAttribute('src', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800');
    });
  });

  describe('Performance', () => {
    it('should not rerender unnecessarily', () => {
      const { rerender } = render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      // Clear the setSessionId call from initial render
      getMockedSwipeTracker().setSessionId.mockClear();

      // Re-render with same props
      rerender(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      // Should not set session ID again if it hasn't changed
      expect(getMockedSwipeTracker().setSessionId).not.toHaveBeenCalled();
    });

    it('should handle rapid interactions without errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <SwipeCard
          destination={mockDestination}
          onSwipe={mockOnSwipe}
          onDetailTap={mockOnDetailTap}
          sessionId={sessionId}
        />
      );

      const likeButton = screen.getByLabelText('Like this place');

      // Rapidly click the button multiple times
      for (let i = 0; i < 10; i++) {
        fireEvent.click(likeButton);
      }

      // Wait for all async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not log any errors
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});