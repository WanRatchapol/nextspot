'use client';

import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { useDrag } from '@use-gesture/react';

interface RecommendationItem {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
}

interface SwipeCardProps {
  destination: RecommendationItem;
  onSwipe: (direction: 'left' | 'right', destination: RecommendationItem) => void;
  onDetailTap: (destination: RecommendationItem) => void;
  isAnimating?: boolean;
}

export function SwipeCard({ destination, onSwipe, onDetailTap, isAnimating = false }: SwipeCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-30, 30]);
  const opacity = useTransform(x, [-300, -150, 0, 150, 300], [0, 1, 1, 1, 0]);

  // Transform for swipe indicators
  const likeOpacity = useTransform(x, [0, 150], [0, 1]);
  const skipOpacity = useTransform(x, [-150, 0], [1, 0]);

  const controls = useAnimation();

  const bind = useDrag(
    ({ down, movement: [mx], velocity: [vx], direction: [dx] }) => {
      if (isAnimating) return;

      const trigger = Math.abs(mx) > 100; // 100px threshold
      const dir = dx > 0 ? 'right' : 'left';

      setIsDragging(down);

      if (!down) {
        if (trigger) {
          // Animate card out
          controls.start({
            x: dx > 0 ? 1000 : -1000,
            opacity: 0,
            transition: { duration: 0.3 }
          }).then(() => {
            onSwipe(dir, destination);
          });
        } else {
          // Snap back to center
          controls.start({
            x: 0,
            transition: { type: 'spring', stiffness: 500, damping: 30 }
          });
        }
      } else {
        // Follow drag
        controls.start({
          x: mx,
          transition: { type: 'tween', duration: 0 }
        });
      }
    },
    {
      axis: 'x',
      bounds: { left: -300, right: 300 },
      rubberband: true,
    }
  );

  const handleCardTap = () => {
    if (!isDragging && !isAnimating) {
      onDetailTap(destination);
    }
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAnimating) {
      controls.start({
        x: 1000,
        opacity: 0,
        transition: { duration: 0.3 }
      }).then(() => {
        onSwipe('right', destination);
      });
    }
  };

  const handleSkipClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAnimating) {
      controls.start({
        x: -1000,
        opacity: 0,
        transition: { duration: 0.3 }
      }).then(() => {
        onSwipe('left', destination);
      });
    }
  };

  return (
    <motion.div
      {...bind()}
      animate={controls}
      style={{ x, rotate, opacity }}
      initial={{ scale: 0.9, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      drag={false} // We handle dragging manually for better control
    >
      <div
        className="destination-card w-full h-full bg-white rounded-2xl shadow-xl overflow-hidden relative select-none"
        onClick={handleCardTap}
        style={{ touchAction: 'pan-x' }}
      >
        {/* Card Image */}
        <div className="card-image h-[60%] relative overflow-hidden">
          <img
            src={destination.imageUrl}
            alt={destination.nameEn}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';
            }}
            draggable={false}
          />

          {/* Swipe Indicators */}
          <motion.div
            style={{ opacity: likeOpacity }}
            className="swipe-indicator like absolute top-1/2 right-5 transform -translate-y-1/2 bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg"
          >
            LIKE ❤️
          </motion.div>

          <motion.div
            style={{ opacity: skipOpacity }}
            className="swipe-indicator skip absolute top-1/2 left-5 transform -translate-y-1/2 bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg"
          >
            SKIP ✖️
          </motion.div>
        </div>

        {/* Card Content */}
        <div className="card-content h-[40%] p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1 leading-tight">
              {destination.nameTh}
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              {destination.nameEn}
            </p>
            <p className="text-gray-700 text-sm leading-snug line-clamp-2">
              {destination.descTh}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-3">
            {destination.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-indigo-100 text-indigo-600 text-xs rounded-full font-medium"
              >
                {tag}
              </span>
            ))}
            {destination.tags.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                +{destination.tags.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons (Fallback for accessibility) */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={handleSkipClick}
            className="bg-red-500 hover:bg-red-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label="Skip this place"
          >
            ✖️
          </button>

          <button
            onClick={handleLikeClick}
            className="bg-green-500 hover:bg-green-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
            aria-label="Like this place"
          >
            ❤️
          </button>
        </div>
      </div>
    </motion.div>
  );
}