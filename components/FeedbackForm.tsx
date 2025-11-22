'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  FeedbackFormProps,
  FeedbackData,
  SatisfactionRating,
  DurationPerception,
  FeedbackValidationErrors
} from '@/types/feedback';
import { StarRating } from './StarRating';
import { DurationSelector } from './DurationSelector';
import { RecommendSelector } from './RecommendSelector';

export function FeedbackForm({
  sessionTiming,
  onSubmit,
  onSkip,
  isLoading = false,
  error = null
}: FeedbackFormProps) {
  // Form state
  const [satisfaction, setSatisfaction] = useState<SatisfactionRating | 0>(0);
  const [perceivedDuration, setPerceivedDuration] = useState<DurationPerception | ''>('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [comments, setComments] = useState('');
  const [validationErrors, setValidationErrors] = useState<FeedbackValidationErrors>({});
  const [currentStep, setCurrentStep] = useState(1);

  const totalSteps = 4;

  // Clear validation errors when user makes changes
  useEffect(() => {
    setValidationErrors({});
  }, [satisfaction, perceivedDuration, wouldRecommend, comments]);

  const validateStep = (step: number): boolean => {
    const errors: FeedbackValidationErrors = {};

    switch (step) {
      case 1:
        if (satisfaction === 0) {
          errors.satisfaction = 'กรุณาให้คะแนนความพอใจ';
        }
        break;
      case 2:
        if (!perceivedDuration) {
          errors.perceivedDuration = 'กรุณาเลือกระยะเวลาที่รู้สึก';
        }
        break;
      case 3:
        if (wouldRecommend === null) {
          errors.wouldRecommend = 'กรุณาเลือกว่าจะแนะนำหรือไม่';
        }
        break;
      case 4:
        // Comments are optional, no validation needed
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate all steps
    let isValid = true;
    for (let step = 1; step <= totalSteps; step++) {
      if (!validateStep(step)) {
        isValid = false;
        // Go to first invalid step
        if (currentStep !== step) {
          setCurrentStep(step);
        }
        break;
      }
    }

    if (!isValid) return;

    const feedbackData: FeedbackData = {
      sessionId: sessionTiming.sessionId,
      validationSessionId: sessionTiming.validationSessionId,
      satisfaction: satisfaction as SatisfactionRating,
      perceivedDuration: perceivedDuration as DurationPerception,
      wouldRecommend: wouldRecommend!,
      comments: comments.trim() || undefined,
      actualDuration: sessionTiming.totalDurationMs,
      completedAt: new Date()
    };

    await onSubmit(feedbackData);
  };

  const getStepTitle = (step: number): string => {
    switch (step) {
      case 1: return 'ความพอใจ';
      case 2: return 'ระยะเวลา';
      case 3: return 'การแนะนำ';
      case 4: return 'ความคิดเห็น';
      default: return '';
    }
  };

  const getStepDescription = (step: number): string => {
    switch (step) {
      case 1: return 'ให้คะแนนประสบการณ์ของคุณ';
      case 2: return 'บอกเราเกี่ยวกับเวลาที่ใช้';
      case 3: return 'จะแนะนำให้เพื่อนๆ ไหม';
      case 4: return 'แบ่งปันความคิดเห็นเพิ่มเติม';
      default: return '';
    }
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1: return satisfaction > 0;
      case 2: return perceivedDuration !== '';
      case 3: return wouldRecommend !== null;
      case 4: return true; // Optional step
      default: return false;
    }
  };

  return (
    <div className="feedback-form max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          แบ่งปันประสบการณ์ของคุณ
        </h1>
        <p className="text-gray-600">
          ช่วยเราปรับปรุงบริการให้ดีขึ้น
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <motion.div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep >= step
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                  }
                  ${isStepComplete(step) && currentStep > step
                    ? 'bg-green-500'
                    : ''
                  }
                `}
                animate={{
                  scale: currentStep === step ? 1.1 : 1,
                  backgroundColor: isStepComplete(step) && currentStep > step
                    ? '#22c55e'
                    : currentStep >= step
                    ? '#3b82f6'
                    : '#e5e7eb'
                }}
              >
                {isStepComplete(step) && currentStep > step ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  step
                )}
              </motion.div>
              {step < 4 && (
                <div
                  className={`
                    flex-1 h-1 mx-2
                    ${currentStep > step ? 'bg-blue-500' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {getStepTitle(currentStep)}
          </h2>
          <p className="text-sm text-gray-600">
            {getStepDescription(currentStep)}
          </p>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p className="text-red-800 text-sm">{error}</p>
        </motion.div>
      )}

      {/* Step content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 1 && (
              <div className="space-y-6">
                <StarRating
                  value={satisfaction}
                  onChange={setSatisfaction}
                  disabled={isLoading}
                  size="large"
                />
                {validationErrors.satisfaction && (
                  <p className="text-red-600 text-sm text-center">
                    {validationErrors.satisfaction}
                  </p>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <DurationSelector
                  value={perceivedDuration}
                  onChange={setPerceivedDuration}
                  actualDuration={sessionTiming.totalDurationMs}
                  disabled={isLoading}
                />
                {validationErrors.perceivedDuration && (
                  <p className="text-red-600 text-sm text-center">
                    {validationErrors.perceivedDuration}
                  </p>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <RecommendSelector
                  value={wouldRecommend}
                  onChange={setWouldRecommend}
                  disabled={isLoading}
                />
                {validationErrors.wouldRecommend && (
                  <p className="text-red-600 text-sm text-center">
                    {validationErrors.wouldRecommend}
                  </p>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    มีความคิดเห็นเพิ่มเติมไหม?
                  </h3>
                  <p className="text-sm text-gray-600">
                    แบ่งปันประสบการณ์หรือข้อเสนอแนะ (ไม่บังคับ)
                  </p>
                </div>

                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  disabled={isLoading}
                  maxLength={1000}
                  rows={6}
                  placeholder="เช่น สถานที่ที่แนะนำตรงกับความต้องการ การใช้งานง่าย หรือข้อเสนอแนะเพื่อการปรับปรุง..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />

                <div className="text-right text-xs text-gray-500">
                  {comments.length}/1000 ตัวอักษร
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
        {/* Previous/Skip button */}
        <div>
          {currentStep === 1 ? (
            <button
              onClick={onSkip}
              disabled={isLoading}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-full"
            >
              ข้าม
            </button>
          ) : (
            <button
              onClick={handlePrevious}
              disabled={isLoading}
              className="px-6 py-3 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-full"
            >
              ← ย้อนกลับ
            </button>
          )}
        </div>

        {/* Next/Submit button */}
        <div>
          {currentStep === totalSteps ? (
            <motion.button
              onClick={handleSubmit}
              disabled={isLoading || !isStepComplete(currentStep)}
              className="px-8 py-3 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังส่ง...</span>
                </div>
              ) : (
                'ส่งความคิดเห็น'
              )}
            </motion.button>
          ) : (
            <motion.button
              onClick={handleNext}
              disabled={isLoading || !isStepComplete(currentStep)}
              className="px-8 py-3 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ถัดไป →
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
