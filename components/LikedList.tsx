'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RecommendationItem {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
}

interface LikedListProps {
  likedDestinations: RecommendationItem[];
  onClose: () => void;
  onContinue: () => void;
}

export function LikedList({ likedDestinations, onClose, onContinue }: LikedListProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 500 }}
        className="bg-white rounded-t-3xl max-h-[80vh] w-full max-w-md mx-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              สถานที่ที่ชอบ
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              ✖️
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {likedDestinations.length} สถานที่
          </p>
        </div>

        {/* Liked Destinations List */}
        <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
          {likedDestinations.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💔</div>
              <p className="text-gray-500">
                คุณยังไม่ได้เลือกสถานที่ใดเลย
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {likedDestinations.map((destination, index) => (
                  <motion.div
                    key={destination.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <img
                      src={destination.imageUrl}
                      alt={destination.nameEn}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {destination.nameTh}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {destination.nameEn}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {destination.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-indigo-100 text-indigo-600 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {destination.tags.length > 2 && (
                          <span className="text-xs text-gray-400">
                            +{destination.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-red-500">
                      ❤️
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-3">
          {likedDestinations.length > 0 && (
            <button
              onClick={onContinue}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              ดูรายละเอียดทั้งหมด
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors"
          >
            {likedDestinations.length > 0 ? 'เลือกต่อ' : 'ปิด'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}