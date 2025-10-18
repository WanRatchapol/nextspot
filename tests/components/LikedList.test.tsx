import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LikedList } from '@/components/LikedList';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

interface RecommendationItem {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
}

const mockDestinations: RecommendationItem[] = [
  {
    id: '1',
    nameTh: 'วัดพระแก้ว',
    nameEn: 'Temple of the Emerald Buddha',
    descTh: 'วัดที่สำคัญที่สุดในประเทศไทย',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    tags: ['วัด', 'วัฒนธรรม', 'ประวัติศาสตร์'],
  },
  {
    id: '2',
    nameTh: 'ตลาดนัดจตุจักร',
    nameEn: 'Chatuchak Weekend Market',
    descTh: 'ตลาดนัดที่ใหญ่ที่สุดในไทย',
    imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800',
    tags: ['ช้อปปิ้ง', 'อาหาร', 'วัฒนธรรม', 'ตลาด', 'นัด'],
  },
];

describe('LikedList', () => {
  const mockOnClose = vi.fn();
  const mockOnContinue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header correctly with liked destinations count', () => {
    render(
      <LikedList
        likedDestinations={mockDestinations}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('สถานที่ที่ชอบ')).toBeInTheDocument();
    expect(screen.getByText('2 สถานที่')).toBeInTheDocument();
  });

  it('renders all liked destinations correctly', () => {
    render(
      <LikedList
        likedDestinations={mockDestinations}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    // Check first destination
    expect(screen.getByText('วัดพระแก้ว')).toBeInTheDocument();
    expect(screen.getByText('Temple of the Emerald Buddha')).toBeInTheDocument();
    expect(screen.getByText('วัด')).toBeInTheDocument();
    expect(screen.getByText('วัฒนธรรม')).toBeInTheDocument();

    // Check second destination
    expect(screen.getByText('ตลาดนัดจตุจักร')).toBeInTheDocument();
    expect(screen.getByText('Chatuchak Weekend Market')).toBeInTheDocument();
    expect(screen.getByText('ช้อปปิ้ง')).toBeInTheDocument();
    expect(screen.getByText('อาหาร')).toBeInTheDocument();
  });

  it('limits tags display to 2 and shows overflow count', () => {
    render(
      <LikedList
        likedDestinations={mockDestinations}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    // For second destination with 5 tags, should show first 2 and +3
    expect(screen.getByText('ช้อปปิ้ง')).toBeInTheDocument();
    expect(screen.getByText('อาหาร')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();

    // Should not show hidden tags
    expect(screen.queryByText('ตลาด')).not.toBeInTheDocument();
    expect(screen.queryByText('นัด')).not.toBeInTheDocument();
  });

  it('renders images with correct src and alt attributes', () => {
    render(
      <LikedList
        likedDestinations={mockDestinations}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);

    expect(images[0]).toHaveAttribute('src', mockDestinations[0].imageUrl);
    expect(images[0]).toHaveAttribute('alt', mockDestinations[0].nameEn);

    expect(images[1]).toHaveAttribute('src', mockDestinations[1].imageUrl);
    expect(images[1]).toHaveAttribute('alt', mockDestinations[1].nameEn);
  });

  it('handles image load error with fallback', () => {
    render(
      <LikedList
        likedDestinations={mockDestinations}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    const image = screen.getAllByRole('img')[0];
    fireEvent.error(image);

    expect(image).toHaveAttribute('src', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800');
  });

  it('shows continue button when there are liked destinations', () => {
    render(
      <LikedList
        likedDestinations={mockDestinations}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    const continueButton = screen.getByText('ดูรายละเอียดทั้งหมด');
    expect(continueButton).toBeInTheDocument();

    fireEvent.click(continueButton);
    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  it('shows different close button text when there are liked destinations', () => {
    render(
      <LikedList
        likedDestinations={mockDestinations}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    const closeButton = screen.getByText('เลือกต่อ');
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no destinations are liked', () => {
    render(
      <LikedList
        likedDestinations={[]}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText('💔')).toBeInTheDocument();
    expect(screen.getByText('คุณยังไม่ได้เลือกสถานที่ใดเลย')).toBeInTheDocument();
    expect(screen.getByText('0 สถานที่')).toBeInTheDocument();
  });

  it('hides continue button when no destinations are liked', () => {
    render(
      <LikedList
        likedDestinations={[]}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.queryByText('ดูรายละเอียดทั้งหมด')).not.toBeInTheDocument();
  });

  it('shows different close button text when no destinations are liked', () => {
    render(
      <LikedList
        likedDestinations={[]}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    const closeButton = screen.getByText('ปิด');
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking overlay background', () => {
    render(
      <LikedList
        likedDestinations={mockDestinations}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    // Click on the overlay (should be the outermost motion.div with bg-black bg-opacity-50)
    const overlay = document.querySelector('.bg-black.bg-opacity-50');
    fireEvent.click(overlay!);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside modal content', () => {
    render(
      <LikedList
        likedDestinations={mockDestinations}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    // Click inside the modal content
    const modalContent = screen.getByText('สถานที่ที่ชอบ');
    fireEvent.click(modalContent);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls onClose when clicking close button in header', () => {
    render(
      <LikedList
        likedDestinations={mockDestinations}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    const headerCloseButton = screen.getByText('✖️');
    fireEvent.click(headerCloseButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders heart icon for each liked destination', () => {
    render(
      <LikedList
        likedDestinations={mockDestinations}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    const heartIcons = screen.getAllByText('❤️');
    expect(heartIcons).toHaveLength(2); // One for each destination
  });

  it('has proper accessibility with modal structure', () => {
    render(
      <LikedList
        likedDestinations={mockDestinations}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    // Modal should have proper z-index for overlay
    const overlay = document.querySelector('.z-50');
    expect(overlay).toBeTruthy();

    // Modal should be fixed positioned
    const fixedOverlay = document.querySelector('.fixed.inset-0');
    expect(fixedOverlay).toBeTruthy();
  });

  it('handles long destination names with truncation', () => {
    const longNameDestination = [{
      id: '1',
      nameTh: 'ชื่อสถานที่ที่ยาวมากจนอาจจะต้องมีการตัดให้สั้นลงเพื่อให้พอดีกับพื้นที่ที่กำหนด',
      nameEn: 'Very Long Destination Name That Might Need Truncation',
      descTh: 'คำอธิบาย',
      imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      tags: ['ทดสอบ'],
    }];

    render(
      <LikedList
        likedDestinations={longNameDestination}
        onClose={mockOnClose}
        onContinue={mockOnContinue}
      />
    );

    // Should render the long name (truncation is handled by CSS)
    expect(screen.getByText('ชื่อสถานที่ที่ยาวมากจนอาจจะต้องมีการตัดให้สั้นลงเพื่อให้พอดีกับพื้นที่ที่กำหนด')).toBeInTheDocument();
  });
});