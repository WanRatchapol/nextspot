import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DurationSelector, CompactDurationSelector } from '@/components/DurationSelector';
import type { DurationPerception } from '@/types/feedback';

describe('DurationSelector Component', () => {
  const mockOnChange = jest.fn();
  const actualDuration = 180000; // 3 minutes

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('DurationSelector', () => {
    it('renders all duration options', () => {
      render(<DurationSelector value="" onChange={mockOnChange} actualDuration={actualDuration} />);

      expect(screen.getByText('เร็วมากกว่าที่คิด')).toBeInTheDocument();
      expect(screen.getByText('เร็วกว่าที่คิด')).toBeInTheDocument();
      expect(screen.getByText('ตามที่คิดไว้')).toBeInTheDocument();
      expect(screen.getByText('ช้ากว่าที่คิด')).toBeInTheDocument();
      expect(screen.getByText('ช้ามากกว่าที่คิด')).toBeInTheDocument();
    });

    it('displays actual duration in formatted text', () => {
      render(<DurationSelector value="" onChange={mockOnChange} actualDuration={actualDuration} />);

      expect(screen.getByText('เวลาที่ใช้จริง: 3 นาที 0 วินาที')).toBeInTheDocument();
    });

    it('formats duration correctly for seconds only', () => {
      render(<DurationSelector value="" onChange={mockOnChange} actualDuration={45000} />);

      expect(screen.getByText('เวลาที่ใช้จริง: 45 วินาที')).toBeInTheDocument();
    });

    it('calls onChange when option is selected', () => {
      render(<DurationSelector value="" onChange={mockOnChange} actualDuration={actualDuration} />);

      const fasterOption = screen.getByText('เร็วกว่าที่คิด');
      fireEvent.click(fasterOption);

      expect(mockOnChange).toHaveBeenCalledWith('faster');
    });

    it('shows selection state correctly', () => {
      render(<DurationSelector value="much_faster" onChange={mockOnChange} actualDuration={actualDuration} />);

      const selectedOption = screen.getByText('เร็วมากกว่าที่คิด').closest('button');
      expect(selectedOption).toHaveClass('border-blue-500', 'bg-blue-50');

      const unselectedOption = screen.getByText('เร็วกว่าที่คิด').closest('button');
      expect(unselectedOption).toHaveClass('border-gray-200', 'bg-white');
    });

    it('displays confirmation message when selection is made', async () => {
      render(<DurationSelector value="same" onChange={mockOnChange} actualDuration={actualDuration} />);

      await waitFor(() => {
        expect(screen.getByText('คุณเลือก: ตามที่คิดไว้')).toBeInTheDocument();
      });
    });

    it('renders emojis for each option', () => {
      render(<DurationSelector value="" onChange={mockOnChange} actualDuration={actualDuration} />);

      expect(screen.getByText('⚡')).toBeInTheDocument(); // much_faster
      expect(screen.getByText('🚀')).toBeInTheDocument(); // faster
      expect(screen.getByText('⏰')).toBeInTheDocument(); // same
      expect(screen.getByText('🐌')).toBeInTheDocument(); // slower
      expect(screen.getByText('⏳')).toBeInTheDocument(); // much_slower
    });

    it('respects disabled state', () => {
      render(<DurationSelector value="" onChange={mockOnChange} actualDuration={actualDuration} disabled />);

      const options = screen.getAllByRole('button');
      options.forEach(option => {
        expect(option).toBeDisabled();
      });

      fireEvent.click(options[0]);
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('has proper accessibility attributes', () => {
      render(<DurationSelector value="" onChange={mockOnChange} actualDuration={actualDuration} />);

      const fasterOption = screen.getByLabelText('Select faster');
      expect(fasterOption).toHaveAttribute('aria-pressed', 'false');

      const { rerender } = render(<DurationSelector value="faster" onChange={mockOnChange} actualDuration={actualDuration} />);
      const selectedOption = screen.getByLabelText('Select faster');
      expect(selectedOption).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('CompactDurationSelector', () => {
    it('renders compact version with pill buttons', () => {
      render(<CompactDurationSelector value="" onChange={mockOnChange} />);

      expect(screen.getByText('ระยะเวลาการตัดสินใจ:')).toBeInTheDocument();

      // Check that options are rendered as compact buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);

      // Check that options include emojis and labels
      expect(screen.getByText('⚡')).toBeInTheDocument();
      expect(screen.getByText('เร็วมากกว่าที่คิด')).toBeInTheDocument();
    });

    it('handles selection in compact mode', () => {
      render(<CompactDurationSelector value="" onChange={mockOnChange} />);

      const slowerOption = screen.getByText('ช้ากว่าที่คิด');
      fireEvent.click(slowerOption);

      expect(mockOnChange).toHaveBeenCalledWith('slower');
    });

    it('shows selected state in compact mode', () => {
      render(<CompactDurationSelector value="same" onChange={mockOnChange} />);

      const selectedButton = screen.getByText('ตามที่คิดไว้').closest('button');
      expect(selectedButton).toHaveClass('bg-blue-500', 'text-white');

      expect(screen.getByText('เลือกแล้ว: ตามที่คิดไว้')).toBeInTheDocument();
    });
  });

  describe('Duration Option Values', () => {
    const durationOptions: Array<[DurationPerception, string, string]> = [
      ['much_faster', 'เร็วมากกว่าที่คิด', '⚡'],
      ['faster', 'เร็วกว่าที่คิด', '🚀'],
      ['same', 'ตามที่คิดไว้', '⏰'],
      ['slower', 'ช้ากว่าที่คิด', '🐌'],
      ['much_slower', 'ช้ามากกว่าที่คิด', '⏳']
    ];

    it.each(durationOptions)('renders correct option for %s', (key, label, emoji) => {
      render(<DurationSelector value="" onChange={mockOnChange} actualDuration={actualDuration} />);

      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(emoji)).toBeInTheDocument();
    });
  });

  describe('Duration Formatting', () => {
    it('formats minutes and seconds correctly', () => {
      render(<DurationSelector value="" onChange={mockOnChange} actualDuration={125000} />);
      expect(screen.getByText('เวลาที่ใช้จริง: 2 นาที 5 วินาที')).toBeInTheDocument();
    });

    it('formats exactly one minute correctly', () => {
      render(<DurationSelector value="" onChange={mockOnChange} actualDuration={60000} />);
      expect(screen.getByText('เวลาที่ใช้จริง: 1 นาที 0 วินาที')).toBeInTheDocument();
    });

    it('formats zero seconds correctly', () => {
      render(<DurationSelector value="" onChange={mockOnChange} actualDuration={0} />);
      expect(screen.getByText('เวลาที่ใช้จริง: 0 วินาที')).toBeInTheDocument();
    });
  });
});