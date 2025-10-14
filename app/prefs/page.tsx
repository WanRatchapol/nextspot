'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePreferencesStore } from '@/lib/stores/preferences';
import {
  PreferencesSchema,
  MOOD_OPTIONS,
  BUDGET_OPTIONS,
  TIME_OPTIONS
} from '@/types/preferences';
import { firePrefsView, firePrefsSubmit } from '@/utils/analytics';

export default function PreferencesPage() {
  const router = useRouter();
  const {
    budgetBand,
    moodTags,
    timeWindow,
    isSubmitting,
    validationErrors,
    setBudgetBand,
    toggleMoodTag,
    setTimeWindow,
    setSubmitting,
    setValidationErrors,
    clearValidationErrors,
    getPreferences,
    isValid
  } = usePreferencesStore();

  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Get session ID from cookies if exists
    const cookies = document.cookie.split(';');
    const sidCookie = cookies.find(cookie => cookie.trim().startsWith('sid='));
    if (sidCookie) {
      setSessionId(sidCookie.split('=')[1]);
    }
  }, []);

  useEffect(() => {
    // Fire analytics event once after sessionId is set
    firePrefsView(sessionId || undefined);
  }, [sessionId]);

  const handleSubmit = async () => {
    clearValidationErrors();

    const preferences = getPreferences();

    // Validate with Zod
    const result = PreferencesSchema.safeParse(preferences);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        errors[path] = issue.message;
      });
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      // Fire analytics event
      firePrefsSubmit(
        result.data.budgetBand,
        result.data.moodTags,
        result.data.timeWindow,
        sessionId || undefined
      );

      // Navigate to recommendations page
      router.push('/recs' as any);
    } catch (error) {
      console.error('Error submitting preferences:', error);
      // Still navigate even if analytics fails
      router.push('/recs' as any);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
      {/* Header */}
      <header className="pt-safe">
        <div className="px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <button
              onClick={() => router.back()}
              data-testid="prefs-back"
              className="absolute left-4 top-6 p-2 text-gray-600 hover:text-gray-800 transition-colors"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              ←
            </button>
            <h1 className="text-2xl font-bold text-indigo-600 mb-2">
              ตั้งค่าความต้องการ
            </h1>
            <p className="text-sm text-gray-600">
              บอกเราว่าคุณต้องการอะไร
            </p>
          </motion.div>
        </div>
      </header>

      {/* Form Content */}
      <main className="px-4 pb-8">
        <div className="max-w-md mx-auto space-y-8">

          {/* Budget Selection */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              💰 งบประมาณ
            </h2>
            <div className="space-y-3">
              {BUDGET_OPTIONS.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
                  onClick={() => setBudgetBand(option.id)}
                  data-testid={`budget-${option.id}`}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    budgetBand === option.id
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">
                        {option.labelThai}
                      </div>
                      <div className="text-sm text-gray-500">
                        {option.range}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {option.description}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
            {validationErrors.budgetBand && (
              <p className="text-red-500 text-sm mt-2" data-testid="err-budgetBand">
                {validationErrors.budgetBand}
              </p>
            )}
          </motion.section>

          {/* Mood Selection */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🎭 อารมณ์ (เลือกได้หลายอย่าง)
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {MOOD_OPTIONS.map((mood, index) => (
                <motion.button
                  key={mood.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.05 }}
                  onClick={() => toggleMoodTag(mood.id)}
                  data-testid={`mood-${mood.id}`}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                    moodTags.includes(mood.id)
                      ? 'border-indigo-500 bg-indigo-50 shadow-md scale-95'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  <div className="text-2xl mb-1">{mood.icon}</div>
                  <div className="font-medium text-sm text-gray-900">
                    {mood.labelThai}
                  </div>
                  <div className="text-xs text-gray-500">
                    {mood.description}
                  </div>
                </motion.button>
              ))}
            </div>
            {validationErrors.moodTags && (
              <p className="text-red-500 text-sm mt-2" data-testid="err-moodTags">
                {validationErrors.moodTags}
              </p>
            )}
          </motion.section>

          {/* Time Window Selection */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              ⏰ ช่วงเวลา
            </h2>
            <div className="space-y-3">
              {TIME_OPTIONS.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  onClick={() => setTimeWindow(option.id)}
                  data-testid={`time-${option.id}`}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    timeWindow === option.id
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">
                        {option.labelThai}
                      </div>
                      <div className="text-sm text-gray-500">
                        {option.duration}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {option.description}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
            {validationErrors.timeWindow && (
              <p className="text-red-500 text-sm mt-2" data-testid="err-timeWindow">
                {validationErrors.timeWindow}
              </p>
            )}
          </motion.section>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="pt-4"
          >
            <button
              onClick={handleSubmit}
              disabled={!isValid() || isSubmitting}
              data-testid="prefs-submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-medium py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:shadow-lg transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
              style={{
                minHeight: '44px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  กำลังประมวลผล...
                </>
              ) : (
                '🔍 ดูสถานที่แนะนำ'
              )}
            </button>

            {!isValid() && (
              <p className="text-gray-500 text-sm text-center mt-3">
                กรุณาเลือกครบทุกหัวข้อ
              </p>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}