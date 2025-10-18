'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface RecommendationItem {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
}

interface RecommendationsResponse {
  items: RecommendationItem[];
  isFastMode?: boolean;
  request_id: string;
}

export default function RecommendationsPage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFastMode, setIsFastMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Get session ID from cookies
    const cookies = document.cookie.split(';');
    const sidCookie = cookies.find(cookie => cookie.trim().startsWith('sid='));
    if (sidCookie) {
      setSessionId(sidCookie.split('=')[1]);
    }
  }, []);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!sessionId) {
        setError('Session not found. Please start from the beginning.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/recommendations?sessionId=${sessionId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to load recommendations');
        }

        const data: RecommendationsResponse = await response.json();
        setRecommendations(data.items);
        setIsFastMode(data.isFastMode || false);

        // Log analytics
        if (process.env.NODE_ENV === 'development') {
          console.log('[Analytics] recs_page_view:', {
            sessionId,
            itemCount: data.items.length,
            isFastMode: data.isFastMode,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setError(error instanceof Error ? error.message : 'Failed to load recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      fetchRecommendations();
    }
  }, [sessionId]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    // Retry by re-triggering the effect
    const currentSessionId = sessionId;
    setSessionId(null);
    setTimeout(() => setSessionId(currentSessionId), 100);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
        <header className="pt-safe">
          <div className="px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-2xl font-bold text-indigo-600 mb-2">
                สถานที่แนะนำ
              </h1>
              <p className="text-sm text-gray-600">
                Places recommended for you
              </p>
            </motion.div>
          </div>
        </header>

        <main className="px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <h2 className="text-xl font-semibold mb-2">
                กำลังค้นหาสถานที่...
              </h2>
              <p className="text-gray-600">
                กรุณารอสักครู่ขณะที่เราค้นหาสถานที่ที่เหมาะกับคุณ
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
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

        <main className="px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold mb-2 text-red-600">
                เกิดข้อผิดพลาด
              </h2>
              <p className="text-gray-600 mb-6">
                {error}
              </p>

              <div className="space-x-2">
                <button
                  onClick={handleRetry}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                >
                  ลองอีกครั้ง
                </button>

                <button
                  onClick={() => router.push('/prefs')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                >
                  แก้ไขความต้องการ
                </button>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // Success state with recommendations
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
              data-testid="recs-back"
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

            {/* Fast Mode Banner */}
            {isFastMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mt-3 inline-block bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium"
                data-testid="fast-mode-banner"
              >
                ⚡ Fast Mode: showing popular places near you
              </motion.div>
            )}
          </motion.div>
        </div>
      </header>

      {/* Recommendations Grid */}
      <main className="px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                data-testid={`rec-card-${item.id}`}
              >
                <div className="aspect-[4/3] relative overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.nameEn}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';
                    }}
                  />
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1" data-testid={`rec-name-${item.id}`}>
                    {item.nameTh}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {item.nameEn}
                  </p>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2" data-testid={`rec-desc-${item.id}`}>
                    {item.descTh}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-indigo-100 text-indigo-600 text-xs rounded-full"
                        data-testid={`rec-tag-${tag}`}
                      >
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                        +{item.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 text-center space-x-4"
          >
            <button
              onClick={() => router.push('/prefs')}
              data-testid="edit-preferences"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
            >
              🔄 แก้ไขความต้องการ
            </button>

            <button
              onClick={() => router.push('/')}
              data-testid="back-to-home"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
            >
              🏠 กลับหน้าแรก
            </button>
          </motion.div>

          {/* Footer Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-8 text-center text-sm text-gray-500"
          >
            แสดง {recommendations.length} สถานที่ {isFastMode ? '(โหมดเร็ว)' : '(ตามความต้องการ)'}
          </motion.div>
        </div>
      </main>
    </div>
  );
}