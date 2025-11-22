'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { LikedDestinationCardProps } from '@/types/liked-destinations';
import { Heart, Zap } from 'lucide-react';

export function LikedDestinationCard({
  destination,
  onRemove,
  showRemoveButton = true
}: LikedDestinationCardProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(destination.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="relative group rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-100 shadow-lg shadow-slate-900/40 backdrop-blur transition-shadow duration-200 hover:shadow-2xl"
    >
      {showRemoveButton && (
        <motion.button
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleRemove}
          className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/90 text-xs font-bold text-white opacity-0 transition-colors hover:bg-rose-500 group-hover:opacity-100"
          aria-label="Remove from liked list"
        >
          ×
        </motion.button>
      )}

      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <img
            src={destination.imageUrl}
            alt={destination.nameEn}
            className="h-16 w-16 rounded-xl object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';
            }}
          />
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 shadow-lg shadow-rose-500/40">
            <Heart className="h-3.5 w-3.5 text-white" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white">{destination.nameTh}</h3>
          <p className="mt-1 truncate text-xs text-slate-300/75">{destination.nameEn}</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {destination.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-slate-100"
              >
                {tag}
              </span>
            ))}
            {destination.tags.length > 2 && (
              <span className="text-xs text-slate-400">
                +{destination.tags.length - 2}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-slate-400/80">
            <span>Liked {formatLikedTime(destination.likedAt)}</span>
            {destination.swipeVelocity && (
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <Zap className="h-3.5 w-3.5" /> Fast swipe
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function CompactLikedDestinationCard({
  destination,
  onRemove,
  showRemoveButton = true
}: LikedDestinationCardProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(destination.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="relative group overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-slate-100 shadow-lg shadow-slate-900/40 backdrop-blur transition-shadow duration-200 hover:shadow-2xl"
    >
      {showRemoveButton && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleRemove}
          className="absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/90 text-xs font-bold text-white opacity-0 transition-colors hover:bg-rose-500 group-hover:opacity-100"
          aria-label="Remove from liked list"
        >
          ×
        </motion.button>
      )}

      <div className="relative">
        <img
          src={destination.imageUrl}
          alt={destination.nameEn}
          className="h-24 w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';
          }}
        />
        <div className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 shadow-lg shadow-rose-500/40">
          <Heart className="h-3 w-3 text-white" />
        </div>
      </div>

      <div className="p-2">
        <h3 className="truncate text-xs font-medium text-white">{destination.nameTh}</h3>
        <p className="truncate text-[11px] text-slate-300/80">{destination.nameEn}</p>
        {destination.tags.length > 0 && (
          <span className="mt-1 inline-block rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] text-slate-100">
            {destination.tags[0]}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function DetailedLikedDestinationCard({
  destination,
  onRemove,
  showRemoveButton = true
}: LikedDestinationCardProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(destination.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="relative group rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-100 shadow-xl shadow-slate-900/45 backdrop-blur transition-all duration-200 hover:shadow-2xl"
    >
      {showRemoveButton && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleRemove}
          className="absolute top-3 right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/90 text-xs font-bold text-white opacity-0 transition-colors hover:bg-rose-500 group-hover:opacity-100"
          aria-label="Remove from liked list"
        >
          ×
        </motion.button>
      )}

      <div className="flex flex-col gap-5 md:flex-row">
        <div className="relative w-full md:w-48 lg:w-56">
          <img
            src={destination.imageUrl}
            alt={destination.nameEn}
            className="h-32 w-full rounded-2xl object-cover md:h-36"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';
            }}
          />
          <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 shadow-lg shadow-rose-500/40">
            <Heart className="h-4.5 w-4.5 text-white" />
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">{destination.nameTh}</h3>
            <p className="text-sm text-slate-300/80">{destination.nameEn}</p>
          </div>

          <p className="text-sm text-slate-200/80">{destination.descTh}</p>

          <div className="flex flex-wrap gap-2 text-xs">
            {destination.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-100"
              >
                #{tag}
              </span>
            ))}
            {destination.tags.length > 4 && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300/80">
                +{destination.tags.length - 4}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300/80">
            <span>Liked {formatLikedTime(destination.likedAt)}</span>
            {destination.swipeVelocity && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-200">
                <Zap className="h-4 w-4" /> Fast swipe
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function formatLikedTime(date: Date) {
  if (!date) return 'recently';

  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
