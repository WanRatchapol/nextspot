'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { DurationSelectorProps, DurationOption } from '@/types/feedback';
import { DURATION_OPTIONS } from '@/types/feedback';

export function DurationSelector({
  value,
  onChange,
  actualDuration,
  disabled = false
}: DurationSelectorProps) {
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes} นาที ${seconds} วินาที`;
    }
    return `${seconds} วินาที`;
  };

  const handleOptionSelect = (option: DurationOption) => {
    if (!disabled) {
      onChange(option.key);
    }
  };

  return (
    <div className="duration-selector space-y-6">
      {/* Question header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">
          การตัดสินใจใช้เวลานานแค่ไหน?
        </h3>
        <p className="text-sm text-gray-600">
          เทียบกับที่คุณคาดไว้
        </p>
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 inline-block">
          เวลาที่ใช้จริง: {formatDuration(actualDuration)}
        </div>
      </div>

      {/* Duration options */}
      <div className="space-y-3">
        {DURATION_OPTIONS.map((option) => {
          const isSelected = value === option.key;

          return (
            <motion.button
              key={option.key}
              type="button"
              onClick={() => handleOptionSelect(option)}
              disabled={disabled}
              className={`
                w-full p-4 rounded-xl border-2 text-left transition-all duration-200
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-md'}
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
              `}
              whileHover={!disabled ? { scale: 1.02 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
              aria-pressed={isSelected}
              aria-label={`Select ${option.label}`}
            >
              <div className="flex items-center space-x-3">
                {/* Emoji indicator */}
                <span className="text-2xl" role="img" aria-label={option.key}>
                  {option.emoji}
                </span>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                      {option.label}
                    </span>

                    {/* Selection indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                      >
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </motion.div>
                    )}
                  </div>

                  {/* Description */}
                  {option.description && (
                    <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selected value display */}
      {value && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-3 bg-blue-50 rounded-lg"
        >
          <p className="text-sm font-medium text-blue-900">
            คุณเลือก: {DURATION_OPTIONS.find(opt => opt.key === value)?.label}
          </p>
        </motion.div>
      )}
    </div>
  );
}

export function CompactDurationSelector({
  value,
  onChange,
  disabled = false
}: Omit<DurationSelectorProps, 'actualDuration'>) {
  const handleOptionSelect = (optionKey: string) => {
    if (!disabled) {
      onChange(optionKey as any);
    }
  };

  return (
    <div className="compact-duration-selector space-y-3">
      <span className="text-sm font-medium text-gray-700">
        ระยะเวลาการตัดสินใจ:
      </span>

      <div className="flex flex-wrap gap-2">
        {DURATION_OPTIONS.map((option) => {
          const isSelected = value === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => handleOptionSelect(option.key)}
              disabled={disabled}
              className={`
                px-3 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-sm'}
                ${isSelected
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
              `}
              aria-pressed={isSelected}
            >
              <span className="mr-1">{option.emoji}</span>
              {option.label}
            </button>
          );
        })}
      </div>

      {value && (
        <p className="text-xs text-gray-600">
          เลือกแล้ว: {DURATION_OPTIONS.find(opt => opt.key === value)?.label}
        </p>
      )}
    </div>
  );
}
