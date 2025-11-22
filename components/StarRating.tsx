'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { StarRatingProps, SatisfactionRating } from '@/types/feedback';
import { Star as StarIcon } from 'lucide-react';

/**
 * StarRating component for satisfaction feedback
 * S-10 Feedback UI + API feature
 */
export function StarRating({
  value,
  onChange,
  disabled = false,
  size = 'medium'
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<SatisfactionRating | 0>(0);

  const sizeClasses = {
    small: 'text-2xl',
    medium: 'text-4xl',
    large: 'text-5xl'
  };

  const containerSizeClasses = {
    small: 'gap-1',
    medium: 'gap-2',
    large: 'gap-3'
  };

  const iconSizeClasses = {
    small: 'h-5 w-5',
    medium: 'h-7 w-7',
    large: 'h-9 w-9'
  };

  const handleStarClick = (rating: SatisfactionRating) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: SatisfactionRating) => {
    if (!disabled) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setHoverValue(0);
    }
  };

  const getRatingText = (rating: SatisfactionRating | 0): string => {
    const texts = {
      0: '',
      1: 'แย่มาก',
      2: 'แย่',
      3: 'ปานกลาง',
      4: 'ดี',
      5: 'ดีเยี่ยม'
    };
    return texts[rating] || '';
  };

  const currentRating = hoverValue || value;

  return (
    <div className="star-rating space-y-4">
      {/* Question label */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          คุณพอใจกับประสบการณ์นี้แค่ไหน?
        </h3>
        <p className="text-sm text-gray-600">
          กดดาวเพื่อให้คะแนนความพอใจ
        </p>
      </div>

      {/* Stars container */}
      <div className={`flex justify-center items-center ${containerSizeClasses[size]}`}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = currentRating >= star;
          const isHovered = hoverValue >= star;

          return (
            <motion.button
              key={star}
              type="button"
              onClick={() => handleStarClick(star as SatisfactionRating)}
              onMouseEnter={() => handleMouseEnter(star as SatisfactionRating)}
              onMouseLeave={handleMouseLeave}
              disabled={disabled}
              className={`
                ${sizeClasses[size]}
                transition-all duration-200 ease-in-out
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}
                ${isFilled ? 'text-yellow-400' : 'text-gray-300'}
                focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 rounded
              `}
              whileHover={!disabled ? { scale: 1.1 } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <motion.span
                animate={{
                  scale: isHovered ? [1, 1.2, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                <StarIcon
                  className={iconSizeClasses[size]}
                  fill={isFilled ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={isFilled ? 0 : 1.5}
                />
              </motion.span>
            </motion.button>
          );
        })}
      </div>

      {/* Rating labels */}
      <div className="flex justify-between text-xs text-gray-500 max-w-xs mx-auto">
        <span>แย่มาก</span>
        <span>ดีเยี่ยม</span>
      </div>

      {/* Current rating display */}
      {currentRating > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-lg font-medium text-gray-800">
            {getRatingText(currentRating)}
          </p>
          <p className="text-sm text-gray-600">
            {currentRating} จาก 5 ดาว
          </p>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Compact version of StarRating for smaller spaces
 */
export function CompactStarRating({
  value,
  onChange,
  disabled = false
}: Omit<StarRatingProps, 'size'>) {
  const [hoverValue, setHoverValue] = useState<SatisfactionRating | 0>(0);

  const handleStarClick = (rating: SatisfactionRating) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const currentRating = hoverValue || value;

  return (
    <div className="compact-star-rating flex items-center space-x-3">
      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
        ความพอใจ:
      </span>

      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = currentRating >= star;

          return (
            <button
              key={star}
              type="button"
              onClick={() => handleStarClick(star as SatisfactionRating)}
              onMouseEnter={() => !disabled && setHoverValue(star as SatisfactionRating)}
              onMouseLeave={() => !disabled && setHoverValue(0)}
              disabled={disabled}
              className={`
                text-xl transition-colors duration-200
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}
                ${isFilled ? 'text-yellow-400' : 'text-gray-300'}
                focus:outline-none focus:ring-1 focus:ring-yellow-400 rounded-full
              `}
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              <StarIcon
                className="h-5 w-5"
                fill={isFilled ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={isFilled ? 0 : 1.5}
              />
            </button>
          );
        })}
      </div>

      {currentRating > 0 && (
        <span className="text-sm text-gray-600">
          ({currentRating}/5)
        </span>
      )}
    </div>
  );
}

/**
 * Read-only display version of StarRating
 */
export function StarRatingDisplay({
  value,
  size = 'medium',
  showLabel = true
}: {
  value: SatisfactionRating;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}) {
  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-3xl'
  };

  const getRatingText = (rating: SatisfactionRating): string => {
    const texts = {
      1: 'แย่มาก',
      2: 'แย่',
      3: 'ปานกลาง',
      4: 'ดี',
      5: 'ดีเยี่ยม'
    };
    return texts[rating];
  };

  return (
    <div className="star-rating-display flex items-center space-x-2">
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`${sizeClasses[size]} ${value >= star ? 'text-yellow-400' : 'text-gray-300'}`}
            fill={value >= star ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={value >= star ? 0 : 1.5}
          />
        ))}
      </div>

      {showLabel && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">{getRatingText(value)}</span>
          <span className="ml-1">({value}/5)</span>
        </div>
      )}
    </div>
  );
}
