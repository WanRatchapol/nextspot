"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Box, Typography, Button, Chip } from "@mui/material";
import { MapPin, DollarSign, Info } from "lucide-react";

interface RecommendationItem {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
  budgetBand: "low" | "mid" | "high";
}

const budgetLabels = {
  low: "฿0-500",
  mid: "฿500-1,500",
  high: "฿1,500+",
};

interface SwipeCardProps {
  destination: RecommendationItem;
  onSwipe: (direction: "left" | "right") => void;
  onDetailTap: () => void;
  isTop?: boolean;
  forceDirection?: "left" | "right" | null;
}

export function SwipeCard({
  destination,
  onSwipe,
  onDetailTap,
  isTop = false,
  forceDirection = null,
}: SwipeCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  // Mock destination images for places without photos
  const mockImages = [
    "https://images.unsplash.com/photo-1414016642750-7fdd78dc33d9?w=800&h=600&fit=crop", // cafe
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop", // restaurant
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop", // bar
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop", // outdoor
    "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=800&h=600&fit=crop", // shopping
    "https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?w=800&h=600&fit=crop", // venue
  ];

  // Create images array with fallbacks
  const images = [
    destination.imageUrl,
    ...mockImages.slice(0, 2), // Add 2 mock images
  ].filter(Boolean);

  // Debug log for images
  useEffect(() => {
    console.log("SwipeCard images array:", images);
    console.log("Current image index:", currentImageIndex);
    console.log("Current image URL:", images[currentImageIndex]);
  }, [images, currentImageIndex]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.x;

    // Check if user swiped with enough distance OR velocity
    if (Math.abs(info.offset.x) > threshold || Math.abs(velocity) > 500) {
      if (info.offset.x > 0 || velocity > 500) {
        // Swipe right (like)
        onSwipe("right");
      } else {
        // Swipe left (nope)
        onSwipe("left");
      }
    } else {
      // Snap back to center if not enough swipe
      x.set(0);
    }
  };

  // Handle button-triggered swipes with smooth animation
  useEffect(() => {
    if (forceDirection) {
      // Animate smoothly to the target position
      const targetX = forceDirection === "right" ? 300 : -300;

      // Use framer-motion's animate function for smooth movement
      import("framer-motion").then(({ animate }) => {
        animate(x, targetX, {
          duration: 0.3,
          ease: "easeOut",
        });
      });
    }
  }, [forceDirection, x]);

  const nextImage = () => {
    console.log(
      "Next image clicked, current:",
      currentImageIndex,
      "total:",
      images.length
    );
    setCurrentImageIndex((prev) => {
      const next = (prev + 1) % images.length;
      console.log("Moving to image index:", next);
      return next;
    });
  };

  const prevImage = () => {
    console.log(
      "Previous image clicked, current:",
      currentImageIndex,
      "total:",
      images.length
    );
    setCurrentImageIndex((prev) => {
      const next = (prev - 1 + images.length) % images.length;
      console.log("Moving to image index:", next);
      return next;
    });
  };

  // Create motion components
  const MotionBox = motion(Box);

  // Get mood tag (first tag as mood indicator)
  const moodTag = destination.tags[0] || "สถานที่น่าสนใจ";

  return (
    <MotionBox
      sx={{
        zIndex: 11,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        cursor: "grab",
        "&:active": {
          cursor: "grabbing",
        },
      }}
      style={{
        x,
        rotate,
      }}
      drag={isTop && !forceDirection ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
      exit={{
        x:
          forceDirection === "right"
            ? 400
            : forceDirection === "left"
            ? -400
            : 0,
        rotate:
          forceDirection === "right" ? 20 : forceDirection === "left" ? -20 : 0,
        opacity: 0,
        transition: { duration: 0.3, ease: "easeOut" },
      }}
    >
      {/* Card container with full image background */}
      <Box
        sx={{
          height: "calc(100vh - 200px)",
          width: "calc(100vw - 32px)",
          mx: "auto",
          position: "relative",
          borderRadius: 6,
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Background Image */}
        {images.length > 0 ? (
          <Box
            component="img"
            src={images[currentImageIndex]}
            alt={destination.nameTh}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
            }}
            onError={(e) => {
              // Fallback to a random mock image if the main image fails
              const randomMockImage =
                mockImages[Math.floor(Math.random() * mockImages.length)];
              e.currentTarget.src = randomMockImage;
            }}
          />
        ) : (
          // Fallback gradient background
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <MapPin size={64} color="white" style={{ opacity: 0.7 }} />
          </Box>
        )}

        {/* Image navigation areas */}
        {images.length > 1 && (
          <>
            <Box
              component="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prevImage();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prevImage();
              }}
              sx={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: "33.333333%",
                zIndex: 50,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                userSelect: "none",
                outline: "none",
                "&:focus": {
                  outline: "none",
                },
                // Debug visual (remove after testing)
                // background: "rgba(255, 0, 0, 0.1)",
              }}
            />
            <Box
              component="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                nextImage();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                nextImage();
              }}
              sx={{
                position: "absolute",
                right: 0,
                top: 0,
                height: "100%",
                width: "33.333333%",
                zIndex: 50,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                userSelect: "none",
                outline: "none",
                "&:focus": {
                  outline: "none",
                },
                // Debug visual (remove after testing)
                // background: "rgba(0, 255, 0, 0.1)",
              }}
            />
          </>
        )}

        {/* Image indicators */}
        {images.length > 1 && (
          <Box
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              right: 16,
              display: "flex",
              gap: 1,
              zIndex: 60,
              pointerEvents: "none", // Don't interfere with image navigation
            }}
          >
            {images.map((_, index) => (
              <Box
                key={index}
                sx={{
                  height: 4,
                  flex: 1,
                  borderRadius: 50,
                  transition: "background-color 0.15s ease-in-out",
                  backgroundColor:
                    index === currentImageIndex
                      ? "white"
                      : "rgba(255, 255, 255, 0.4)",
                }}
              />
            ))}
          </Box>
        )}

        {/* Gradient overlay for content readability */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.8) 100%)",
            zIndex: 2,
          }}
        />

        {/* Budget badge - Top right */}
        <Box
          sx={{
            position: "absolute",
            top: 30,
            right: 10,
            zIndex: 30,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              borderRadius: 50,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(8px)",
              px: 3,
              py: 1.5,
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <DollarSign size={16} color="white" />
            <Typography
              sx={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "white",
              }}
            >
              {budgetLabels[destination.budgetBand]}
            </Typography>
          </Box>
        </Box>

        {/* Swipe indicators */}
        <MotionBox
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 25,
          }}
          style={{ opacity: useTransform(x, [50, 150], [0, 1]) }}
        >
          <MotionBox
            sx={{
              borderRadius: 4,
              backgroundColor: "#22c55e",
              px: 6,
              py: 3,
              transform: "rotate(12deg)",
              border: "4px solid white",
              boxShadow:
                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            }}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <Typography
              sx={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "white",
              }}
            >
              LIKE
            </Typography>
          </MotionBox>
        </MotionBox>

        <MotionBox
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 25,
          }}
          style={{ opacity: useTransform(x, [-150, -50], [1, 0]) }}
        >
          <MotionBox
            sx={{
              borderRadius: 4,
              backgroundColor: "#ef4444",
              px: 6,
              py: 3,
              transform: "rotate(-12deg)",
              border: "4px solid white",
              boxShadow:
                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            }}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <Typography
              sx={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "white",
              }}
            >
              NOPE
            </Typography>
          </MotionBox>
        </MotionBox>

        {/* Content overlay - Bottom section */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            px: 3,
            pb: 6,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* Mood tag */}
          <Box>
            <Chip
              label={moodTag}
              size="small"
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                color: "#1f2937",
                fontSize: "0.75rem",
                fontWeight: 600,
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
            />
          </Box>

          {/* Destination name */}
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "white",
                lineHeight: 1.2,
                textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {destination.nameTh}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontSize: "1rem",
                color: "rgba(255, 255, 255, 0.9)",
                mt: 0.5,
                textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
              }}
            >
              {destination.nameEn}
            </Typography>
          </Box>

          {/* Detail button */}
          <Box sx={{ mt: 1 }}>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDetailTap();
              }}
              variant="contained"
              startIcon={<Info size={18} />}
              fullWidth
              sx={{
                height: 48,
                borderRadius: 25,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                color: "#1f2937",
                fontSize: "0.9rem",
                fontWeight: 600,
                textTransform: "none",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                "&:hover": {
                  backgroundColor: "white",
                  transform: "translateY(-1px)",
                  boxShadow: "0 6px 16px rgba(0, 0, 0, 0.2)",
                },
                transition: "all 0.2s ease-in-out",
              }}
            >
              ดูรายละเอียด
            </Button>
          </Box>
        </Box>
      </Box>
    </MotionBox>
  );
}
