'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { fireLandingPageView, fireCtaClick, hasActiveSession, createSession } from '@/utils/analytics';

export default function LandingPage() {
  const router = useRouter();
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useEffect(() => {
    // Fire analytics event on page load
    fireLandingPageView();
  }, []);

  const handleCtaClick = async () => {
    setIsCreatingSession(true);
    fireCtaClick('เริ่มต้นเลือกสถานที่', '/prefs');

    try {
      // Check if user already has a session
      if (!hasActiveSession()) {
        // Create a new session
        const sessionId = await createSession();
        if (!sessionId) {
          console.error('Failed to create session, proceeding anyway');
        }
      }

      // Navigate to preferences page
      router.push('/prefs');
    } catch (error) {
      console.error('Error handling CTA click:', error);
      // Continue to preferences page even if session creation fails
      router.push('/prefs');
    } finally {
      setIsCreatingSession(false);
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
            <h1 className="text-2xl font-bold text-indigo-600 mb-2">
              NextSpot
            </h1>
            <p className="text-sm text-gray-600">
              ค้นหาสถานที่ที่ใช่สำหรับคุณ
            </p>
          </motion.div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center mb-12"
        >
          {/* Value Proposition */}
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 thai-text leading-tight">
            ค้นหาสถานที่ที่สมบูรณ์แบบ<br />
            <span className="text-indigo-600">ใน 5 นาทีด้วยการสไลด์</span>
          </h2>

          <p className="text-lg text-gray-600 mb-8 thai-text max-w-md mx-auto">
            Find your perfect spot in under 5 minutes by swiping
          </p>

          {/* Gesture Preview */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-12 relative"
          >
            <div className="w-64 h-40 mx-auto bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden relative">
              {/* Mock destination card */}
              <div className="w-full h-24 bg-gradient-to-r from-green-400 to-blue-500"></div>
              <div className="p-3">
                <h4 className="font-semibold text-sm">สยามสแควร์</h4>
                <p className="text-xs text-gray-500">Shopping & Entertainment</p>
              </div>

              {/* Swipe indicator */}
              <motion.div
                animate={{
                  x: [0, 20, 0],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-2xl pointer-events-none"
              >
                👉
              </motion.div>
            </div>

            <p className="text-sm text-gray-500 mt-3">
              สไลด์ขวา = ชอบ • สไลด์ซ้าย = ไม่สนใจ
            </p>
          </motion.div>
        </motion.div>

        {/* How it works */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-12"
        >
          <h3 className="text-xl font-semibold text-center mb-8 text-gray-900">
            วิธีใช้งาน 3 ขั้นตอนง่าย ๆ
          </h3>

          <div className="space-y-6 max-w-sm mx-auto">
            {[
              {
                step: '1',
                title: 'ตั้งค่าความต้องการ',
                desc: 'บอกเราเกี่ยวกับงบ อารมณ์ และเวลาที่มี',
                icon: '⚙️'
              },
              {
                step: '2',
                title: 'สไลด์เลือกสถานที่',
                desc: 'สไลด์ขวาที่สถานที่ที่ชอบ สไลด์ซ้ายที่ไม่สนใจ',
                icon: '📱'
              },
              {
                step: '3',
                title: 'รับรายการสถานที่',
                desc: 'ได้รับรายการสถานที่ที่คัดสรรแล้ว',
                icon: '📍'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                className="flex items-start space-x-4 p-4 bg-white/50 rounded-xl"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-indigo-600">{item.step}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1 thai-text">
                    {item.title}
                  </h4>
                  <p className="text-sm text-gray-600 thai-text">
                    {item.desc}
                  </p>
                </div>
                <div className="text-xl">
                  {item.icon}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center"
        >
          <button
            onClick={handleCtaClick}
            disabled={isCreatingSession}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:shadow-lg transition-all duration-200 thai-text focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
            style={{
              minHeight: '44px',
              minWidth: '44px',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {isCreatingSession ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                กำลังเตรียม...
              </>
            ) : (
              '🚀 เริ่มต้นเลือกสถานที่'
            )}
          </button>

          <p className="text-sm text-gray-500 mt-4 thai-text">
            ไม่ต้องสมัครสมาชิก • ใช้ฟรี
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-8 text-center text-xs text-gray-400">
        <p>Made for Thai university students ❤️</p>
      </footer>
    </div>
  );
}