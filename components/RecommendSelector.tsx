'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { RecommendSelectorProps } from '@/types/feedback';
import type { LucideIcon } from 'lucide-react';
import { ThumbsUp, ThumbsDown, PartyPopper, ClipboardList } from 'lucide-react';

export function RecommendSelector({
  value,
  onChange,
  disabled = false
}: RecommendSelectorProps) {
  const handleOptionSelect = (recommend: boolean) => {
    if (!disabled) {
      onChange(recommend);
    }
  };

  const options: Array<{
    value: boolean;
    label: string;
    description: string;
    color: 'green' | 'red';
    Icon: LucideIcon;
  }> = [
    {
      value: true,
      label: 'แนะนำ',
      description: 'ฉันจะแนะนำให้เพื่อนๆ ใช้',
      color: 'green',
      Icon: ThumbsUp,
    },
    {
      value: false,
      label: 'ไม่แนะนำ',
      description: 'ฉันไม่แนะนำให้เพื่อนๆ ใช้',
      color: 'red',
      Icon: ThumbsDown,
    }
  ];

  return (
    <div className="recommend-selector space-y-6">
      {/* Question header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">
          คุณจะแนะนำให้เพื่อนใช้บริการนี้ไหม?
        </h3>
        <p className="text-sm text-gray-600">
          แบ่งปันประสบการณ์ดีๆ ให้เพื่อนๆ
        </p>
      </div>

      {/* Recommendation options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((option) => {
          const isSelected = value === option.value;
          const colorClasses = {
            green: {
              border: isSelected ? 'border-green-500' : 'border-gray-200',
              bg: isSelected ? 'bg-green-50' : 'bg-white',
              text: isSelected ? 'text-green-900' : 'text-gray-900',
              textSecondary: isSelected ? 'text-green-700' : 'text-gray-600',
              ring: 'focus:ring-green-500',
              indicator: 'bg-green-500'
            },
            red: {
              border: isSelected ? 'border-red-500' : 'border-gray-200',
              bg: isSelected ? 'bg-red-50' : 'bg-white',
              text: isSelected ? 'text-red-900' : 'text-gray-900',
              textSecondary: isSelected ? 'text-red-700' : 'text-gray-600',
              ring: 'focus:ring-red-500',
              indicator: 'bg-red-500'
            }
          };

          const styles = colorClasses[option.color as keyof typeof colorClasses];
          const OptionIcon = option.Icon;
          const iconColor = isSelected
            ? option.color === 'green'
              ? 'text-green-600'
              : 'text-red-600'
            : 'text-gray-500';

          return (
            <motion.button
              key={option.value.toString()}
              type="button"
              onClick={() => handleOptionSelect(option.value)}
              disabled={disabled}
              className={`
                p-6 rounded-xl border-2 text-center transition-all duration-200
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-lg'}
                ${styles.border} ${styles.bg}
                focus:outline-none focus:ring-2 ${styles.ring} focus:ring-opacity-50
              `}
              whileHover={!disabled ? { scale: 1.02 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
              aria-pressed={isSelected}
              aria-label={`${option.value ? 'Recommend' : 'Do not recommend'}`}
            >
              <div className="space-y-3">
                {/* Emoji and selection indicator */}
                <div className="flex items-center justify-center space-x-2">
                  <div className={`rounded-full p-3 ${isSelected ? 'bg-white/20' : 'bg-white/10'}`}>
                    <OptionIcon className={`h-6 w-6 ${iconColor}`} />
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`w-6 h-6 ${styles.indicator} rounded-full flex items-center justify-center`}
                    >
                      <svg
                        className="w-4 h-4 text-white"
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

                {/* Label and description */}
                <div className="space-y-1">
                  <h4 className={`text-xl font-semibold ${styles.text}`}>
                    {option.label}
                  </h4>
                  <p className={`text-sm ${styles.textSecondary}`}>
                    {option.description}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selected value confirmation */}
      {value !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center p-4 rounded-lg ${
            value ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <p
            className={`text-sm font-medium flex items-center justify-center gap-2 ${
              value ? 'text-green-900' : 'text-red-900'
            }`}
          >
            {value ? (
              <>
                <PartyPopper className="h-4 w-4" /> ขอบคุณ! การแนะนำของคุณมีความหมายกับเรา
              </>
            ) : (
              <>
                <ClipboardList className="h-4 w-4" /> ขอบคุณสำหรับความคิดเห็น เราจะปรับปรุงให้ดีขึ้น
              </>
            )}
          </p>
        </motion.div>
      )}
    </div>
  );
}

export function CompactRecommendSelector({
  value,
  onChange,
  disabled = false
}: RecommendSelectorProps) {
  const handleOptionSelect = (recommend: boolean) => {
    if (!disabled) {
      onChange(recommend);
    }
  };

  return (
    <div className="compact-recommend-selector space-y-3">
      <span className="text-sm font-medium text-gray-700">
        จะแนะนำให้เพื่อนไหม:
      </span>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={() => handleOptionSelect(true)}
          disabled={disabled}
          className={`
            flex-1 px-4 py-3 rounded-full font-medium transition-all duration-200
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-sm'}
            ${value === true
              ? 'bg-green-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50
          `}
          aria-pressed={value === true}
        >
          <ThumbsUp className="mr-2 h-4.5 w-4.5" />
          แนะนำ
        </button>

        <button
          type="button"
          onClick={() => handleOptionSelect(false)}
          disabled={disabled}
          className={`
            flex-1 px-4 py-3 rounded-full font-medium transition-all duration-200
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-sm'}
            ${value === false
              ? 'bg-red-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50
          `}
          aria-pressed={value === false}
        >
          <ThumbsDown className="mr-2 h-4.5 w-4.5" />
          ไม่แนะนำ
        </button>
      </div>

      {value !== null && (
        <p className="text-xs text-gray-600 text-center">
          เลือกแล้ว: {value ? 'แนะนำ' : 'ไม่แนะนำ'}
        </p>
      )}
    </div>
  );
}
