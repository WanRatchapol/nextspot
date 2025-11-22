import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecommendSelector, CompactRecommendSelector } from '@/components/RecommendSelector';

describe('RecommendSelector Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('RecommendSelector', () => {
    it('renders both recommendation options', () => {
      render(<RecommendSelector value={null} onChange={mockOnChange} />);

      expect(screen.getByText('แนะนำ')).toBeInTheDocument();
      expect(screen.getByText('ไม่แนะนำ')).toBeInTheDocument();
      expect(screen.getByText('ฉันจะแนะนำให้เพื่อนๆ ใช้')).toBeInTheDocument();
      expect(screen.getByText('ฉันไม่แนะนำให้เพื่อนๆ ใช้')).toBeInTheDocument();
    });

    it('renders question header correctly', () => {
      render(<RecommendSelector value={null} onChange={mockOnChange} />);

      expect(screen.getByText('คุณจะแนะนำให้เพื่อนใช้บริการนี้ไหม?')).toBeInTheDocument();
      expect(screen.getByText('แบ่งปันประสบการณ์ดีๆ ให้เพื่อนๆ')).toBeInTheDocument();
    });

    it('calls onChange with true when recommend button is clicked', () => {
      render(<RecommendSelector value={null} onChange={mockOnChange} />);

      const recommendButton = screen.getByText('แนะนำ').closest('button');
      fireEvent.click(recommendButton!);

      expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it('calls onChange with false when not recommend button is clicked', () => {
      render(<RecommendSelector value={null} onChange={mockOnChange} />);

      const notRecommendButton = screen.getByText('ไม่แนะนำ').closest('button');
      fireEvent.click(notRecommendButton!);

      expect(mockOnChange).toHaveBeenCalledWith(false);
    });

    it('shows correct selected state for recommend', () => {
      render(<RecommendSelector value={true} onChange={mockOnChange} />);

      const recommendButton = screen.getByText('แนะนำ').closest('button');
      const notRecommendButton = screen.getByText('ไม่แนะนำ').closest('button');

      expect(recommendButton).toHaveClass('border-green-500', 'bg-green-50');
      expect(notRecommendButton).toHaveClass('border-gray-200', 'bg-white');
    });

    it('shows correct selected state for not recommend', () => {
      render(<RecommendSelector value={false} onChange={mockOnChange} />);

      const recommendButton = screen.getByText('แนะนำ').closest('button');
      const notRecommendButton = screen.getByText('ไม่แนะนำ').closest('button');

      expect(recommendButton).toHaveClass('border-gray-200', 'bg-white');
      expect(notRecommendButton).toHaveClass('border-red-500', 'bg-red-50');
    });

    it('displays confirmation message when recommend is selected', async () => {
      render(<RecommendSelector value={true} onChange={mockOnChange} />);

      await waitFor(() => {
        expect(screen.getByText('🎉 ขอบคุณ! การแนะนำของคุณมีความหมายกับเรา')).toBeInTheDocument();
      });
    });

    it('displays feedback message when not recommend is selected', async () => {
      render(<RecommendSelector value={false} onChange={mockOnChange} />);

      await waitFor(() => {
        expect(screen.getByText('📝 ขอบคุณสำหรับความคิดเห็น เราจะปรับปรุงให้ดีขึ้น')).toBeInTheDocument();
      });
    });

    it('renders correct emojis for options', () => {
      render(<RecommendSelector value={null} onChange={mockOnChange} />);

      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('👎')).toBeInTheDocument();
    });

    it('respects disabled state', () => {
      render(<RecommendSelector value={null} onChange={mockOnChange} disabled />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });

      fireEvent.click(buttons[0]);
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('has proper accessibility attributes', () => {
      render(<RecommendSelector value={null} onChange={mockOnChange} />);

      const recommendButton = screen.getByLabelText('Recommend');
      const notRecommendButton = screen.getByLabelText('Do not recommend');

      expect(recommendButton).toHaveAttribute('aria-pressed', 'false');
      expect(notRecommendButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('updates aria-pressed when selection changes', () => {
      const { rerender } = render(<RecommendSelector value={null} onChange={mockOnChange} />);

      rerender(<RecommendSelector value={true} onChange={mockOnChange} />);

      const recommendButton = screen.getByLabelText('Recommend');
      const notRecommendButton = screen.getByLabelText('Do not recommend');

      expect(recommendButton).toHaveAttribute('aria-pressed', 'true');
      expect(notRecommendButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('CompactRecommendSelector', () => {
    it('renders compact version with inline buttons', () => {
      render(<CompactRecommendSelector value={null} onChange={mockOnChange} />);

      expect(screen.getByText('จะแนะนำให้เพื่อนไหม:')).toBeInTheDocument();

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);

      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('👎')).toBeInTheDocument();
    });

    it('handles selection in compact mode', () => {
      render(<CompactRecommendSelector value={null} onChange={mockOnChange} />);

      const recommendButton = screen.getByText('แนะนำ');
      fireEvent.click(recommendButton);

      expect(mockOnChange).toHaveBeenCalledWith(true);
    });

    it('shows selected state in compact mode', () => {
      render(<CompactRecommendSelector value={true} onChange={mockOnChange} />);

      const recommendButton = screen.getByText('แนะนำ').closest('button');
      const notRecommendButton = screen.getByText('ไม่แนะนำ').closest('button');

      expect(recommendButton).toHaveClass('bg-green-500', 'text-white');
      expect(notRecommendButton).toHaveClass('bg-gray-100', 'text-gray-700');

      expect(screen.getByText('เลือกแล้ว: แนะนำ')).toBeInTheDocument();
    });

    it('shows not recommend state in compact mode', () => {
      render(<CompactRecommendSelector value={false} onChange={mockOnChange} />);

      const recommendButton = screen.getByText('แนะนำ').closest('button');
      const notRecommendButton = screen.getByText('ไม่แนะนำ').closest('button');

      expect(recommendButton).toHaveClass('bg-gray-100', 'text-gray-700');
      expect(notRecommendButton).toHaveClass('bg-red-500', 'text-white');

      expect(screen.getByText('เลือกแล้ว: ไม่แนะนำ')).toBeInTheDocument();
    });
  });

  describe('Selection Indicator Animation', () => {
    it('shows selection indicator when option is selected', () => {
      render(<RecommendSelector value={true} onChange={mockOnChange} />);

      // Check for checkmark icon in selected option
      const checkmarks = screen.getAllByRole('img', { hidden: true });
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('does not show selection indicator when no option is selected', () => {
      render(<RecommendSelector value={null} onChange={mockOnChange} />);

      // Should not have any checkmark indicators
      const svgs = document.querySelectorAll('svg');
      expect(svgs).toHaveLength(0);
    });
  });

  describe('Color Theming', () => {
    it('applies green theme for recommend option when selected', () => {
      render(<RecommendSelector value={true} onChange={mockOnChange} />);

      const recommendButton = screen.getByText('แนะนำ').closest('button');
      expect(recommendButton).toHaveClass('border-green-500', 'bg-green-50');

      const title = screen.getByText('แนะนำ');
      expect(title).toHaveClass('text-green-900');
    });

    it('applies red theme for not recommend option when selected', () => {
      render(<RecommendSelector value={false} onChange={mockOnChange} />);

      const notRecommendButton = screen.getByText('ไม่แนะนำ').closest('button');
      expect(notRecommendButton).toHaveClass('border-red-500', 'bg-red-50');

      const title = screen.getByText('ไม่แนะนำ');
      expect(title).toHaveClass('text-red-900');
    });
  });
});