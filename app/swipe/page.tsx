'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { SwipeCard } from '@/components/SwipeCard';
import { LikedList } from '@/components/LikedList';

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

export default function SwipePage() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<RecommendationItem[]>([]);
  const [likedDestinations, setLikedDestinations] = useState<RecommendationItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFastMode, setIsFastMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showLikedList, setShowLikedList] = useState(false);
  const [isCardAnimating, setIsCardAnimating] = useState(false);

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
        setDestinations(data.items.slice(0, 10)); // Max 10 cards as per requirements
        setIsFastMode(data.isFastMode || false);

        // Log analytics
        if (process.env.NODE_ENV === 'development') {
          console.log('[Analytics] card_stack_loaded:', {
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

  const handleSwipe = (direction: 'left' | 'right', destination: RecommendationItem) => {
    if (isCardAnimating) return;

    setIsCardAnimating(true);

    // Log analytics
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] card_swiped:', {
        sessionId,
        destinationId: destination.id,
        direction,
        cardIndex: currentIndex,
        timestamp: Date.now()
      });
    }

    if (direction === 'right') {
      setLikedDestinations(prev => [...prev, destination]);
    }

    // Move to next card after animation
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setIsCardAnimating(false);
    }, 300);
  };

  const handleDetailTap = (destination: RecommendationItem) => {
    // Log analytics
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] card_tapped:', {
        sessionId,
        destinationId: destination.id,
        timestamp: Date.now()
      });
    }
    // TODO: Implement detail modal
    console.log('Show details for:', destination);
  };

  const handleViewLiked = () => {
    setShowLikedList(true);
  };

  const handleContinueToResults = () => {
    // Navigate to results page with liked destinations
    router.push('/recs');
  };

  const handleLoadMore = () => {
    // Reset stack with current liked destinations
    setCurrentIndex(0);
    // TODO: Load more destinations from API
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold mb-2">
            กำลังค้นหาสถานที่...
          </h2>
          <p className="text-gray-600">
            กรุณารอสักครู่ขณะที่เราค้นหาสถานที่ที่เหมาะกับคุณ
          </p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2 text-red-600">
            เกิดข้อผิดพลาด
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/prefs')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg"
          >
            กลับไปตั้งค่าความต้องการ
          </button>
        </motion.div>
      </div>
    );
  }

  // Show liked list overlay
  if (showLikedList) {
    return (
      <LikedList
        likedDestinations={likedDestinations}
        onClose={() => setShowLikedList(false)}
        onContinue={handleContinueToResults}
      />
    );
  }

  const currentCard = destinations[currentIndex];
  const hasMoreCards = currentIndex < destinations.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
      {/* Header */}
      <header className="pt-safe px-4 py-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            ←
          </button>

          <div className="text-center">
            <h1 className="text-lg font-bold text-indigo-600">
              เลือกสถานที่ที่ชอบ
            </h1>
            <p className="text-sm text-gray-600">
              {destinations.length - currentIndex} สถานที่เหลือ
            </p>
          </div>

          <button
            onClick={handleViewLiked}
            className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            ❤️
            {likedDestinations.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {likedDestinations.length}
              </span>
            )}
          </button>
        </div>

        {/* Fast Mode Banner */}
        {isFastMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="mt-4 bg-amber-100 text-amber-800 px-3 py-2 rounded-lg text-center text-sm"
          >
            ⚡ Fast Mode: showing popular places near you
          </motion.div>
        )}
      </header>

      {/* Card Stack Area */}
      <main className="px-4 py-8 flex-1 flex flex-col items-center justify-center">
        <div className="relative w-full max-w-sm mx-auto h-[500px]">
          {!hasMoreCards ? (
            // Empty stack state
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-6"
            >
              <div className="text-6xl">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900">
                เยี่ยมเลย!
              </h2>
              <p className="text-gray-600">
                คุณได้ดูสถานที่ครบแล้ว
              </p>

              <div className="space-y-3">
                {likedDestinations.length > 0 ? (
                  <button
                    onClick={handleContinueToResults}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl"
                  >
                    ดูสถานที่ที่ชอบ ({likedDestinations.length})
                  </button>
                ) : (
                  <p className="text-gray-500">
                    คุณยังไม่ได้เลือกสถานที่ใดเลย
                  </p>
                )}

                <button
                  onClick={handleLoadMore}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl"
                >
                  ดูสถานที่เพิ่มเติม
                </button>
              </div>
            </motion.div>
          ) : (
            // Card stack
            <AnimatePresence mode="wait">
              {currentCard && (
                <SwipeCard
                  key={currentCard.id}
                  destination={currentCard}
                  onSwipe={handleSwipe}
                  onDetailTap={handleDetailTap}
                  isAnimating={isCardAnimating}
                />
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Instructions */}
        {hasMoreCards && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 text-center space-y-2"
          >
            <p className="text-sm text-gray-600">
              สไลด์ขวา = ชอบ • สไลด์ซ้าย = ไม่สนใจ
            </p>
            <p className="text-xs text-gray-500">
              หรือแตะเพื่อดูรายละเอียด
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}