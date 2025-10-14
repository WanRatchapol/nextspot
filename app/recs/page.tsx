'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function RecommendationsPage() {
  const router = useRouter();

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
              className="absolute left-4 top-6 p-2 text-gray-600 hover:text-gray-800 transition-colors"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              ←
            </button>
            <h1 className="text-2xl font-bold text-indigo-600 mb-2">
              สถานที่แนะนำ
            </h1>
            <p className="text-sm text-gray-600">
              Places recommended for you
            </p>
          </motion.div>
        </div>
      </header>

      {/* Placeholder Content */}
      <main className="px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-xl font-semibold mb-2">
              ขอบคุณสำหรับความต้องการ!
            </h2>
            <p className="text-gray-600 mb-6">
              เรากำลังเตรียมสถานที่แนะนำสำหรับคุณ<br />
              หน้านี้จะพร้อมในเร็วๆ นี้
            </p>

            <div className="space-y-2 text-left text-sm text-gray-500 mb-6">
              <div>✅ ได้รับข้อมูลความต้องการแล้ว</div>
              <div>🔄 กำลังจับคู่สถานที่...</div>
              <div>⏳ S-04: Preferences API (กำลังมา)</div>
              <div>⏳ S-05: Recommendations API (กำลังมา)</div>
            </div>

            <button
              onClick={() => router.push('/prefs')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 mr-2"
            >
              ← แก้ไขความต้องการ
            </button>

            <button
              onClick={() => router.push('/')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
            >
              กลับหน้าแรก
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}