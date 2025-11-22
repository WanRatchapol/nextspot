import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackForm } from '@/components/FeedbackForm';
import type { SessionBreakdown, FeedbackData } from '@/types/feedback';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('FeedbackForm Component', () => {
  const mockSessionTiming: SessionBreakdown = {
    sessionId: 'test-session-123',
    validationSessionId: 'validation-456',
    totalDurationMs: 180000, // 3 minutes
    phases: {
      preferences: 30000,
      swiping: 120000,
      review: 30000,
    },
    timestamps: {
      started: new Date('2025-01-01T10:00:00Z'),
      completed: new Date('2025-01-01T10:03:00Z'),
    },
  };

  const mockOnSubmit = jest.fn();
  const mockOnSkip = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnSkip.mockClear();
  });

  describe('Form Structure and Navigation', () => {
    it('renders initial step with satisfaction rating', () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      expect(screen.getByText('แบ่งปันประสบการณ์ของคุณ')).toBeInTheDocument();
      expect(screen.getByText('ความพอใจ')).toBeInTheDocument();
      expect(screen.getByText('ให้คะแนนประสบการณ์ของคุณ')).toBeInTheDocument();
      expect(screen.getByText('ข้าม')).toBeInTheDocument();
    });

    it('shows progress indicator with 4 steps', () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      // Check for 4 step indicators
      const stepIndicators = screen.getAllByText(/^[1-4]$/);
      expect(stepIndicators).toHaveLength(4);
    });

    it('navigates to next step when valid data is provided', async () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      // Fill step 1 - satisfaction rating
      const stars = screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-label')?.includes('Rate'));
      fireEvent.click(stars[3]); // Click 4th star

      // Navigate to step 2
      const nextButton = screen.getByText('ถัดไป →');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('ระยะเวลา')).toBeInTheDocument();
        expect(screen.getByText('บอกเราเกี่ยวกับเวลาที่ใช้')).toBeInTheDocument();
      });
    });

    it('prevents navigation when step is invalid', () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      // Try to navigate without selecting rating
      const nextButton = screen.getByText('ถัดไป →');
      fireEvent.click(nextButton);

      // Should show validation error and remain on step 1
      expect(screen.getByText('กรุณาให้คะแนนความพอใจ')).toBeInTheDocument();
      expect(screen.getByText('ความพอใจ')).toBeInTheDocument();
    });

    it('allows navigation backwards', async () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      // Complete step 1
      const stars = screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-label')?.includes('Rate'));
      fireEvent.click(stars[3]);
      fireEvent.click(screen.getByText('ถัดไป →'));

      await waitFor(() => {
        expect(screen.getByText('ระยะเวลา')).toBeInTheDocument();
      });

      // Go back to step 1
      fireEvent.click(screen.getByText('← ย้อนกลับ'));

      await waitFor(() => {
        expect(screen.getByText('ความพอใจ')).toBeInTheDocument();
      });
    });
  });

  describe('Step Content', () => {
    it('shows duration selector on step 2', async () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      // Navigate to step 2
      const stars = screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-label')?.includes('Rate'));
      fireEvent.click(stars[3]);
      fireEvent.click(screen.getByText('ถัดไป →'));

      await waitFor(() => {
        expect(screen.getByText('การตัดสินใจใช้เวลานานแค่ไหน?')).toBeInTheDocument();
        expect(screen.getByText('เวลาที่ใช้จริง: 3 นาที 0 วินาที')).toBeInTheDocument();
      });
    });

    it('shows recommendation selector on step 3', async () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      // Navigate through steps
      await navigateToStep(3);

      expect(screen.getByText('คุณจะแนะนำให้เพื่อนใช้บริการนี้ไหม?')).toBeInTheDocument();
      expect(screen.getByText('แนะนำ')).toBeInTheDocument();
      expect(screen.getByText('ไม่แนะนำ')).toBeInTheDocument();
    });

    it('shows comments section on step 4', async () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      // Navigate through steps
      await navigateToStep(4);

      expect(screen.getByText('มีความคิดเห็นเพิ่มเติมไหม?')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('ส่งความคิดเห็น')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with complete data', async () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      // Complete all steps
      await navigateToStep(4);

      // Add comments
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Great experience!' } });

      // Submit
      fireEvent.click(screen.getByText('ส่งความคิดเห็น'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          sessionId: 'test-session-123',
          validationSessionId: 'validation-456',
          satisfaction: 4,
          perceivedDuration: 'faster',
          wouldRecommend: true,
          comments: 'Great experience!',
          actualDuration: 180000,
          completedAt: expect.any(Date),
        });
      });
    });

    it('submits form without comments', async () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      // Complete required steps only
      await navigateToStep(4);

      // Submit without comments
      fireEvent.click(screen.getByText('ส่งความคิดเห็น'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            comments: undefined,
          })
        );
      });
    });

    it('prevents submission with incomplete data', async () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      // Navigate to final step without completing all required fields
      const stars = screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-label')?.includes('Rate'));
      fireEvent.click(stars[3]);

      // Try to navigate to step 4 without completing step 2
      fireEvent.click(screen.getByText('ถัดไป →'));

      await waitFor(() => {
        fireEvent.click(screen.getByText('ถัดไป →'));
      });

      // Should show validation error for step 2
      expect(screen.getByText('กรุณาเลือกระยะเวลาที่รู้สึก')).toBeInTheDocument();
    });
  });

  describe('Skip Functionality', () => {
    it('calls onSkip when skip button is clicked', () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      fireEvent.click(screen.getByText('ข้าม'));

      expect(mockOnSkip).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('shows loading state when isLoading is true', () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
          isLoading={true}
        />
      );

      // All interactive elements should be disabled
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('shows loading text on submit button when submitting', async () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
          isLoading={true}
        />
      );

      await navigateToStep(4);

      expect(screen.getByText('กำลังส่ง...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when provided', () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
          error="Something went wrong"
        />
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Character Limit', () => {
    it('enforces character limit on comments', async () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      await navigateToStep(4);

      const textarea = screen.getByRole('textbox');
      const longText = 'a'.repeat(1001); // Exceed 1000 character limit

      fireEvent.change(textarea, { target: { value: longText } });

      // Should be truncated to 1000 characters
      expect(textarea).toHaveValue('a'.repeat(1000));
    });

    it('shows character count', async () => {
      render(
        <FeedbackForm
          sessionTiming={mockSessionTiming}
          onSubmit={mockOnSubmit}
          onSkip={mockOnSkip}
        />
      );

      await navigateToStep(4);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Hello' } });

      expect(screen.getByText('5/1000 ตัวอักษร')).toBeInTheDocument();
    });
  });

  // Helper function to navigate to a specific step
  async function navigateToStep(targetStep: number) {
    // Step 1: Satisfaction
    if (targetStep >= 1) {
      const stars = screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-label')?.includes('Rate'));
      fireEvent.click(stars[3]); // Select 4 stars
    }

    if (targetStep >= 2) {
      fireEvent.click(screen.getByText('ถัดไป →'));
      await waitFor(() => {
        expect(screen.getByText('ระยะเวลา')).toBeInTheDocument();
      });
    }

    // Step 2: Duration
    if (targetStep >= 2) {
      const fasterOption = screen.getByText('เร็วกว่าที่คิด');
      fireEvent.click(fasterOption);
    }

    if (targetStep >= 3) {
      fireEvent.click(screen.getByText('ถัดไป →'));
      await waitFor(() => {
        expect(screen.getByText('การแนะนำ')).toBeInTheDocument();
      });
    }

    // Step 3: Recommendation
    if (targetStep >= 3) {
      const recommendButton = screen.getByText('แนะนำ').closest('button');
      fireEvent.click(recommendButton!);
    }

    if (targetStep >= 4) {
      fireEvent.click(screen.getByText('ถัดไป →'));
      await waitFor(() => {
        expect(screen.getByText('ความคิดเห็น')).toBeInTheDocument();
      });
    }
  }
});