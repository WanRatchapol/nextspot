'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { FeedbackForm } from '@/components/FeedbackForm';
import type { FeedbackData, FeedbackResponse, FeedbackApiError, SessionBreakdown } from '@/types/feedback';
import { trackFeedbackEvent } from '@/utils/feedback-analytics';
import {
  PartyPopper,
  CheckCircle,
  Clock3,
  Sparkles,
  ThumbsUp,
  Meh,
  Frown,
} from 'lucide-react';

function FeedbackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [sessionTiming, setSessionTiming] = useState<SessionBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState<FeedbackResponse | null>(null);

  // Get session data from URL params
  useEffect(() => {
    const sessionId = searchParams.get('sessionId');
    const validationSessionId = searchParams.get('validationSessionId');
    const totalDuration = searchParams.get('totalDuration');
    const preferencesPhase = searchParams.get('preferencesPhase');
    const swipingPhase = searchParams.get('swipingPhase');
    const reviewPhase = searchParams.get('reviewPhase');

    if (!sessionId || !validationSessionId || !totalDuration) {
      setError('ไม่พบข้อมูลเซสชั่น กรุณาเริ่มต้นใหม่');
      return;
    }

    const timing = {
      sessionId,
      validationSessionId,
      totalDurationMs: parseInt(totalDuration, 10),
      phases: {
        preferences: preferencesPhase ? parseInt(preferencesPhase, 10) : 0,
        swiping: swipingPhase ? parseInt(swipingPhase, 10) : 0,
        review: reviewPhase ? parseInt(reviewPhase, 10) : 0,
      },
      timestamps: {
        started: new Date(Date.now() - parseInt(totalDuration, 10)),
        completed: new Date(),
      }
    };

    setSessionTiming(timing);

    // Track analytics event
    trackFeedbackEvent.formViewed(sessionId, parseInt(totalDuration, 10));
  }, [searchParams]);

  const handleSubmit = async (feedbackData: FeedbackData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...feedbackData,
          completedAt: feedbackData.completedAt.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as FeedbackApiError;
        throw new Error(errorData.error.message || 'Failed to submit feedback');
      }

      const result = data as FeedbackResponse;
      setFeedbackResult(result);
      setSubmitted(true);

      // Track analytics event
      trackFeedbackEvent.submitted(
        feedbackData.sessionId,
        result.feedbackId,
        feedbackData.satisfaction,
        feedbackData.perceivedDuration,
        feedbackData.wouldRecommend,
        feedbackData.actualDuration,
        result.validationResults.targetMet
      );

      // Track target achievement if met
      if (result.validationResults.targetMet) {
        trackFeedbackEvent.targetMet(
          feedbackData.sessionId,
          result.feedbackId,
          feedbackData.actualDuration,
          feedbackData.satisfaction
        );
      }

    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งความคิดเห็น');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Track analytics event
    if (sessionTiming) {
      trackFeedbackEvent.skipped(sessionTiming.sessionId, sessionTiming.totalDurationMs);
    }

    // Redirect to home or completion page
    router.push('/');
  };

  const handleReturnHome = () => {
    router.push('/');
  };

  // Loading state
  if (!sessionTiming && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">กำลังโหลดแบบฟอร์มความคิดเห็น...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !sessionTiming) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">เกิดข้อผิดพลาด</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleReturnHome}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted && feedbackResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full bg-white rounded-lg shadow-lg p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>

          <h1 className="mb-4 flex items-center justify-center gap-2 text-2xl font-bold text-gray-900">
            <PartyPopper className="h-6 w-6 text-green-600" /> ขอบคุณสำหรับความคิดเห็น!
          </h1>

          <p className="text-gray-600 mb-6">
            ความคิดเห็นของคุณช่วยให้เราปรับปรุงบริการให้ดีขึ้น
          </p>

          {/* Validation results */}
          <div className="space-y-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">ผลการประเมิน</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">เป้าหมายเวลา:</span>
                  <span className={`inline-flex items-center gap-2 font-medium ${
                    feedbackResult.validationResults.targetMet ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {feedbackResult.validationResults.targetMet ? (
                      <>
                        <CheckCircle className="h-4 w-4" /> บรรลุ
                      </>
                    ) : (
                      <>
                        <Clock3 className="h-4 w-4" /> ใกล้เคียง
                      </>
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">ระดับความพอใจ:</span>
                  <span className={`inline-flex items-center gap-2 font-medium ${
                    feedbackResult.validationResults.satisfactionLevel === 'excellent' ? 'text-green-600' :
                    feedbackResult.validationResults.satisfactionLevel === 'good' ? 'text-blue-600' :
                    feedbackResult.validationResults.satisfactionLevel === 'average' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {(() => {
                      const level = feedbackResult.validationResults.satisfactionLevel;
                      switch (level) {
                        case 'excellent':
                          return <><Sparkles className="h-4 w-4" /> ดีเยี่ยม</>;
                        case 'good':
                          return <><ThumbsUp className="h-4 w-4" /> ดี</>;
                        case 'average':
                          return <><Meh className="h-4 w-4" /> ปานกลาง</>;
                        default:
                          return <><Frown className="h-4 w-4" /> ต้องปรับปรุง</>;
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleReturnHome}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              เริ่มการค้นหาใหม่
            </button>

            <p className="text-xs text-gray-500">
              ID: {feedbackResult.feedbackId}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main feedback form
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <FeedbackForm
        sessionTiming={sessionTiming!}
        onSubmit={handleSubmit}
        onSkip={handleSkip}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <FeedbackPageContent />
    </Suspense>
  );
}
