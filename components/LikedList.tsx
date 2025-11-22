"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LikedDestination } from "@/types/liked-destinations";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Trash2,
  Share2,
  Navigation,
  Calendar,
  Users,
  Filter,
  SortAsc,
} from "lucide-react";

interface LikedListProps {
  likedDestinations: LikedDestination[];
  onRemove: (destinationId: string) => void;
  onComplete: () => void;
  onContinueSwiping: () => void;
  sessionTiming: {
    startTime: Date;
    preferencesTime: number;
    swipingTime: number;
    totalTime: number;
  };
}

const budgetLabels = {
  low: "฿0-500",
  mid: "฿500-1,500",
  high: "฿1,500+",
};

const budgetColors = {
  low: "bg-green-100 text-green-800",
  mid: "bg-blue-100 text-blue-800",
  high: "bg-purple-100 text-purple-800",
};

export function LikedList({
  likedDestinations,
  onRemove,
  onComplete,
  onContinueSwiping,
}: LikedListProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedDestination, setSelectedDestination] =
    useState<LikedDestination | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "budget" | "name">("recent");
  const [showGuestBanner, setShowGuestBanner] = useState(!user);

  const sortedDestinations = [...likedDestinations].sort((a, b) => {
    switch (sortBy) {
      case "recent":
        return new Date(b.likedAt).getTime() - new Date(a.likedAt).getTime();
      case "budget":
        const budgetOrder = { low: 1, mid: 2, high: 3 };
        return budgetOrder[a.budgetBand] - budgetOrder[b.budgetBand];
      case "name":
        return a.nameTh.localeCompare(b.nameTh);
      default:
        return 0;
    }
  });

  const handleShare = () => {
    const shareText = `ฉันเจอสถานที่เจ้งในกทม.! ${
      likedDestinations.length
    } ที่\n\n${likedDestinations
      .map((dest) => `• ${dest.nameTh}`)
      .join("\n")}\n\nมาจาก NextSpot`;

    if (navigator.share) {
      navigator.share({
        title: "สถานที่ที่ฉันชอบ - NextSpot",
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      // Show toast notification here
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col mb-[100px]">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10"
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onContinueSwiping}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  สถานที่ที่ชอบ
                </h1>
                <p className="text-sm text-gray-600">
                  {likedDestinations.length} สถานที่
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
              >
                <Share2 className="h-5 w-5 text-blue-600" />
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-gray-100 rounded-lg text-sm border-0 focus:ring-2 focus:ring-blue-500"
              >
                <option value="recent">ล่าสุด</option>
                <option value="budget">งบประมาณ</option>
                <option value="name">ชื่อ</option>
              </select>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Guest User Banner */}
      {!user && showGuestBanner && likedDestinations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-4 relative"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium">
                🎉 สร้างบัญชีเพื่อบันทึกสถานที่ที่ชอบถาวร!
              </p>
              <p className="text-xs text-white/80 mt-1">
                ข้อมูลของคุณจะหายหากล้างข้อมูลเบราว์เซอร์
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/register")}
                className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full hover:bg-white/30 transition-colors"
              >
                สร้างบัญชี
              </button>
              <button
                onClick={() => setShowGuestBanner(false)}
                className="text-white/80 hover:text-white px-3 py-1 rounded-full"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {likedDestinations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
              <Heart className="h-12 w-12 text-gray-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                ยังไม่มีสถานที่ที่ชอบ
              </h2>
              <p className="text-gray-600 mb-6">
                เริ่มสไลด์เพื่อค้นหาสถานที่ที่ใช่สำหรับคุณ
              </p>
            </div>
            <button
              onClick={onContinueSwiping}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-medium hover:from-pink-600 hover:to-purple-600 transition-colors"
            >
              เริ่มเลือกสถานที่
            </button>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Destinations Grid - Scrollable Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6 pb-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {sortedDestinations.map((destination, index) => (
                  <motion.div
                    key={destination.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedDestination(destination)}
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-gray-100">
                      <img
                        src={destination.imageUrl}
                        alt={destination.nameTh}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1414016642750-7fdd78dc33d9?w=400&h=300&fit=crop";
                        }}
                      />

                      {/* Budget Badge */}
                      <div className="absolute top-3 right-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            budgetColors[destination.budgetBand]
                          }`}
                        >
                          {budgetLabels[destination.budgetBand]}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(destination.id);
                        }}
                        className="absolute top-3 left-3 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 mb-1">
                            {destination.nameTh}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {destination.nameEn}
                          </p>
                        </div>

                        <p className="text-gray-700 text-sm line-clamp-2 leading-relaxed">
                          {destination.descTh}
                        </p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1">
                          {destination.tags.slice(0, 2).map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700"
                            >
                              <Star className="h-3 w-3" />
                              {tag}
                            </span>
                          ))}
                          {destination.tags.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-500">
                              +{destination.tags.length - 2}
                            </span>
                          )}
                        </div>

                        {/* Liked time */}
                        <div className="flex items-center gap-1 text-xs text-gray-500 pt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(destination.likedAt).toLocaleDateString(
                              "th-TH",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </>
      )}

      {/* Fixed Bottom Actions - Always at screen bottom */}
      {likedDestinations.length > 0 && (
        <div
          className="bg-white border-t border-gray-200 p-6"
          style={{
            paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom, 0px))`,
          }}
        >
          <div className="flex gap-3 max-w-lg mx-auto">
            <button
              onClick={onContinueSwiping}
              className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors text-base"
            >
              เลือกเพิ่ม
            </button>
            <button
              onClick={onComplete}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-medium hover:from-pink-600 hover:to-purple-600 transition-colors text-base"
            >
              ดูแผนที่ ({likedDestinations.length})
            </button>
          </div>
        </div>
      )}

      {/* Destination Detail Modal */}
      <AnimatePresence>
        {selectedDestination && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelectedDestination(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Image */}
              <div className="relative h-64 bg-gray-100">
                <img
                  src={selectedDestination.imageUrl}
                  alt={selectedDestination.nameTh}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://images.unsplash.com/photo-1414016642750-7fdd78dc33d9?w=400&h=300&fit=crop";
                  }}
                />
                <button
                  onClick={() => setSelectedDestination(null)}
                  className="absolute top-4 right-4 w-8 h-8 bg-black/20 backdrop-blur-sm rounded-full flex items-center justify-center"
                >
                  <ArrowLeft className="h-4 w-4 text-white rotate-45" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {selectedDestination.nameTh}
                  </h2>
                  <p className="text-lg text-gray-600">
                    {selectedDestination.nameEn}
                  </p>
                </div>

                <p className="text-gray-700 leading-relaxed">
                  {selectedDestination.descTh}
                </p>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {budgetLabels[selectedDestination.budgetBand]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">
                      {new Date(selectedDestination.likedAt).toLocaleDateString(
                        "th-TH"
                      )}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {selectedDestination.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                    >
                      <Star className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      // Add navigation logic here
                      console.log("Navigate to:", selectedDestination.nameTh);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-full font-medium hover:bg-blue-600 transition-colors"
                  >
                    <Navigation className="h-4 w-4" />
                    นำทาง
                  </button>
                  <button
                    onClick={() => {
                      onRemove(selectedDestination.id);
                      setSelectedDestination(null);
                    }}
                    className="px-4 py-3 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors"
                  >
                    ลบออก
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
