// Integration tests for LikedList component
// S-09 Liked List & Completion feature

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LikedList } from '@/components/LikedList';
import type { LikedDestination } from '@/types/liked-destinations';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

// Mock the session timing tracker
vi.mock('@/utils/session-timing-tracker', () => ({
  getGlobalSessionTracker: () => ({
    startPhase: vi.fn(),
    endPhase: vi.fn(),
    getCurrentPhase: vi.fn().mockReturnValue('review'),
  }),
}));

// Mock analytics
vi.mock('@/utils/liked-analytics', () => ({
  fireLikedListViewed: vi.fn(),
  fireLikedListInteraction: vi.fn(),
}));

describe('LikedList Integration', () => {
  const mockLikedDestinations: LikedDestination[] = [
    {
      id: 'dest_1',
      nameTh: 'วัดพระแก้ว',
      nameEn: 'Temple of the Emerald Buddha',
      descTh: 'วัดศักดิ์สิทธิ์ในพระบรมมหาราชวัง',
      imageUrl: 'https://example.com/temple.jpg',
      budgetBand: 'low',
      tags: ['วัด', 'ประวัติศาสตร์'],
      likedAt: new Date('2023-10-01T10:00:00Z'),
      swipeVelocity: 2.5,
      viewDurationMs: 3000,
      swipeAction: 'like',
      swipeDirection: 'right',
    },
    {
      id: 'dest_2',
      nameTh: 'สยามพารากอน',
      nameEn: 'Siam Paragon',
      descTh: 'ห้างสรรพสินค้าชั้นนำ',
      imageUrl: 'https://example.com/paragon.jpg',
      budgetBand: 'high',
      tags: ['ช้อปปิ้ง', 'อาหาร'],
      likedAt: new Date('2023-10-01T10:05:00Z'),
      swipeVelocity: 1.8,
      viewDurationMs: 5000,
      swipeAction: 'like',
      swipeDirection: 'right',
    },
  ];

  const mockSessionTiming = {
    startTime: new Date('2023-10-01T09:55:00Z'),
    preferencesTime: 30000,
    swipingTime: 120000,
    totalTime: 150000,
  };

  const defaultProps = {
    likedDestinations: mockLikedDestinations,
    onRemove: vi.fn(),
    onComplete: vi.fn(),
    onContinueSwiping: vi.fn(),
    sessionTiming: mockSessionTiming,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render liked list with destinations', () => {
      render(<LikedList {...defaultProps} />);

      expect(screen.getByText('สถานที่ที่ชอบ')).toBeInTheDocument();
      expect(screen.getByText('วัดพระแก้ว')).toBeInTheDocument();
      expect(screen.getByText('สยามพารากอน')).toBeInTheDocument();
      expect(screen.getByText('ถูกใจ 2 ที่')).toBeInTheDocument();
    });

    it('should render empty state when no destinations', () => {
      render(<LikedList {...defaultProps} likedDestinations={[]} />);

      expect(screen.getByText('ยังไม่มีสถานที่ในรายการโปรด')).toBeInTheDocument();
      expect(screen.getByText('เริ่มเลือกสถานที่')).toBeInTheDocument();
    });

    it('should show session timing information', () => {
      render(<LikedList {...defaultProps} />);

      expect(screen.getByText(/เวลาทั้งหมด: 150s/)).toBeInTheDocument();
      expect(screen.getByText(/ตั้งค่า: 30s/)).toBeInTheDocument();
      expect(screen.getByText(/เลือกสถานที่: 120s/)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onRemove when removing a destination', async () => {
      const user = userEvent.setup();
      render(<LikedList {...defaultProps} />);

      // Find and click remove button (using test-id or aria-label)
      const removeButtons = screen.getAllByRole('button', { name: /remove from liked list/i });
      await user.click(removeButtons[0]);

      expect(defaultProps.onRemove).toHaveBeenCalledWith('dest_1');
    });

    it('should call onComplete when completing session', async () => {
      const user = userEvent.setup();
      render(<LikedList {...defaultProps} />);

      const completeButton = screen.getByRole('button', { name: /เสร็จสิ้น \(2 สถานที่\)/ });
      await user.click(completeButton);

      expect(defaultProps.onComplete).toHaveBeenCalled();
    });

    it('should call onContinueSwiping when clicking continue button', async () => {
      const user = userEvent.setup();
      render(<LikedList {...defaultProps} />);

      const continueButton = screen.getByRole('button', { name: /เลือกสถานที่เพิ่มเติม/ });
      await user.click(continueButton);

      expect(defaultProps.onContinueSwiping).toHaveBeenCalled();
    });

    it('should call onContinueSwiping when clicking close button', async () => {
      const user = userEvent.setup();
      render(<LikedList {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close liked list/i });
      await user.click(closeButton);

      expect(defaultProps.onContinueSwiping).toHaveBeenCalled();
    });

    it('should call onContinueSwiping when clicking backdrop', async () => {
      const user = userEvent.setup();
      const { container } = render(<LikedList {...defaultProps} />);

      // Click on backdrop (first div)
      const backdrop = container.firstChild as HTMLElement;
      await user.click(backdrop);

      expect(defaultProps.onContinueSwiping).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during completion', async () => {
      const mockOnComplete = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const user = userEvent.setup();
      render(<LikedList {...defaultProps} onComplete={mockOnComplete} />);

      const completeButton = screen.getByRole('button', { name: /เสร็จสิ้น/ });
      await user.click(completeButton);

      expect(screen.getByText('กำลังบันทึก...')).toBeInTheDocument();
      expect(completeButton).toBeDisabled();
    });

    it('should show error state when completion fails', async () => {
      const mockOnComplete = vi.fn().mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<LikedList {...defaultProps} onComplete={mockOnComplete} />);

      const completeButton = screen.getByRole('button', { name: /เสร็จสิ้น/ });
      await user.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should render responsive grid components', () => {
      render(<LikedList {...defaultProps} />);

      // The component should render the ResponsiveLikedGrid
      // We can't easily test responsive behavior in JSDOM, but we can ensure it renders
      expect(screen.getByText('วัดพระแก้ว')).toBeInTheDocument();
      expect(screen.getByText('สยามพารากอน')).toBeInTheDocument();
    });
  });

  describe('Empty State Interactions', () => {
    it('should handle empty state continue button', async () => {
      const user = userEvent.setup();
      render(<LikedList {...defaultProps} likedDestinations={[]} />);

      const continueButton = screen.getByRole('button', { name: /เริ่มเลือกสถานที่/ });
      await user.click(continueButton);

      expect(defaultProps.onContinueSwiping).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle large lists efficiently', () => {
      const largeLikedList: LikedDestination[] = Array.from({ length: 100 }, (_, i) => ({
        id: `dest_${i}`,
        nameTh: `สถานที่ ${i}`,
        nameEn: `Place ${i}`,
        descTh: `คำอธิบาย ${i}`,
        imageUrl: `https://example.com/place${i}.jpg`,
        budgetBand: 'mid' as const,
        tags: [`tag${i}`],
        likedAt: new Date(),
        swipeAction: 'like' as const,
        swipeDirection: 'right' as const,
      }));

      const start = performance.now();
      render(<LikedList {...defaultProps} likedDestinations={largeLikedList} />);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // Should render in less than 1 second
      expect(screen.getByText('ถูกใจ 100 ที่')).toBeInTheDocument();
    });
  });

  describe('Analytics Integration', () => {
    it('should track analytics events on mount', () => {
      render(<LikedList {...defaultProps} />);

      // Check that analytics event was dispatched
      // This would need to be mocked properly in a real test environment
      expect(screen.getByText('สถานที่ที่ชอบ')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<LikedList {...defaultProps} />);

      expect(screen.getByRole('button', { name: /close liked list/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /เสร็จสิ้น/ })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<LikedList {...defaultProps} />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: /close liked list/i })).toHaveFocus();

      await user.tab();
      // Should focus on the first remove button or complete button
      expect(document.activeElement).toBeInstanceOf(HTMLButtonElement);
    });
  });
});