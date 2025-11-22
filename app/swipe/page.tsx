"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  Stack,
} from "@mui/material";
import ModernLoader from "@/components/ModernLoader";
import { SwipeCard } from "@/components/SwipeCard";
import type { SwipeAction, SwipeDirection } from "@/types/swipe-events";
import { AlertTriangle, Heart, X, Sparkles } from "lucide-react";

interface RecommendationItem {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
  budgetBand: "low" | "mid" | "high";
}

interface RecommendationsResponse {
  items: RecommendationItem[];
  isFastMode?: boolean;
  request_id: string;
}

export default function SwipePage() {
  const router = useRouter();
  const [page, setPage] = useState(0); // for future paging (safe even if server ignores)
  const [allGone, setAllGone] = useState(false); // true when we truly have no more results to show

  const [destinations, setDestinations] = useState<RecommendationItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFastMode, setIsFastMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCardAnimating, setIsCardAnimating] = useState(false);
  const [cardSwipeDirection, setCardSwipeDirection] = useState<
    "left" | "right" | null
  >(null);
  const [isGuest, setIsGuest] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);
  const [showGuestLimit, setShowGuestLimit] = useState(false);

  // --- add this helper (near the top of the component file) ---
  async function recordSwipe(opts: {
    sessionId: string;
    destinationId: string;
    action: "like" | "skip" | "detail_tap";
    direction: "left" | "right" | "tap";
    velocity?: number;
    viewDurationMs?: number;
  }) {
    try {
      await fetch("/api/swipe-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          sessionId: opts.sessionId,
          destinationId: opts.destinationId,
          action: opts.action,
          direction: opts.direction,
          velocity: opts.velocity ?? 0,
          viewDurationMs: opts.viewDurationMs ?? 0,
          clientTimestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.warn("recordSwipe failed", e);
    }
  }

  useEffect(() => {
    const cookies = document.cookie.split(";");
    const sidCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("sid=")
    );
    if (sidCookie) {
      setSessionId(sidCookie.split("=")[1]);
    } else {
      router.push("/");
    }
  }, [router]);

  // Fetch session info to check if guest and get swipe count
  useEffect(() => {
    const fetchSessionInfo = async () => {
      if (!sessionId) return;

      try {
        const response = await fetch(`/api/sessions`, {
          cache: "no-store",
        });

        if (response.ok) {
          const sessionData = await response.json();
          setIsGuest(sessionData.isGuest);
          setSwipeCount(sessionData.swipeCount);
        }
      } catch (error) {
        console.error("Failed to fetch session info:", error);
      }
    };

    if (sessionId) {
      fetchSessionInfo();
    }
  }, [sessionId]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!sessionId) {
        setError("Session not found. Please start from the beginning.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/recommendations?sessionId=${sessionId}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || "Failed to load recommendations"
          );
        }

        const data: RecommendationsResponse = await response.json();

        setDestinations(data.items.slice(0, 10));
        setIsFastMode(!!data.isFastMode);

        // Store destinations in sessionStorage for detail page access
        sessionStorage.setItem(
          "swipe-destinations",
          JSON.stringify(data.items.slice(0, 10))
        );

        // ✅ if we truly have nothing to show (filters + popular empty)
        setAllGone(data.items.length === 0);

        if (process.env.NODE_ENV === "development") {
          console.log("[Analytics] card_stack_loaded:", {
            sessionId,
            itemCount: data.items.length,
            isFastMode: data.isFastMode,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load recommendations"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      fetchRecommendations();
    }
  }, [sessionId]);

  // --- REPLACE your existing handleSwipe with this ---
  const handleSwipe = (direction: "left" | "right", velocity?: number) => {
    if (isCardAnimating || currentIndex >= destinations.length) return;

    // Check guest swipe limit
    if (isGuest && swipeCount >= 5) {
      setShowGuestLimit(true);
      return;
    }

    const destination = destinations[currentIndex];
    if (!destination) return;

    setIsCardAnimating(true);

    const swipeAction: SwipeAction = direction === "right" ? "like" : "skip";
    const swipeDirection: SwipeDirection = direction;

    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics] card_swiped:", {
        sessionId,
        destinationId: destination.id,
        direction,
        cardIndex: currentIndex,
        timestamp: Date.now(),
      });
    }

    // 1) Persist immediately (server will write-through for like/skip)
    if (sessionId) {
      recordSwipe({
        sessionId,
        destinationId: destination.id,
        action: swipeAction,
        direction: swipeDirection,
        velocity,
        // viewDurationMs: sessionTracker.getCurrentCardViewMs?.()
      });
    }

    // Server will handle persistence through recordSwipe above

    // Update swipe count for guest users
    if (isGuest) {
      setSwipeCount((prev) => prev + 1);
    }

    // 3) Advance to next card after the animation delay
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setIsCardAnimating(false);
    }, 300);
  };

  const handleButtonSwipe = (direction: "left" | "right") => {
    if (isCardAnimating || currentIndex >= destinations.length) return;

    setIsCardAnimating(true);

    // Animate the card smoothly in the chosen direction
    setCardSwipeDirection(direction);

    // Process the swipe after animation completes
    setTimeout(() => {
      handleSwipe(direction);
      setCardSwipeDirection(null);
    }, 300); // Match the card animation duration
  };

  const handleDetailTap = () => {
    const destination = destinations[currentIndex];
    if (destination) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Analytics] card_tapped:", {
          sessionId,
          destinationId: destination.id,
          timestamp: Date.now(),
        });
      }
      // Navigate to destination detail page
      router.push(`/destinations/${destination.id}`);
    }
  };

  const handleContinueToResults = () => {
    router.push("/recs");
  };

  const handleLoadMore = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      // optimistic next page (server may ignore 'page', it's ok)
      const next = page + 1;
      const res = await fetch(
        `/api/recommendations?sessionId=${sessionId}&page=${next}&includeSkipped=true`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to load more");
      }
      const data: RecommendationsResponse = await res.json();

      // de-dupe against current deck
      const currentIds = new Set(destinations.map((d) => d.id));
      const fresh = data.items.filter((it) => !currentIds.has(it.id));

      // update UI flags
      setIsFastMode(!!data.isFastMode);

      if (fresh.length === 0) {
        // nothing new to show → we're effectively out
        setAllGone(true);
        return;
      }

      // append new cards, keep current index (do NOT reset to 0)
      setDestinations((prev) => [...prev, ...fresh]);
      setPage(next);
      setAllGone(false);
    } catch (e) {
      console.error("Load more failed:", e);
      setError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          component={motion.div}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Stack spacing={3} alignItems="center">
            <ModernLoader
              size={88}
              label="กำลังค้นหาสถานที่ที่เหมาะกับคุณ..."
            />
            {/* <Stack spacing={1} alignItems="center">
              <Typography
                variant="h4"
                sx={{ fontWeight: "bold", color: "white" }}
              >
                กำลังค้นหาสถานที่...
              </Typography>
              <Typography sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                เตรียมการ์ดที่คัดสรรให้คุณ
              </Typography>
            </Stack> */}
          </Stack>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
        }}
      >
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Stack spacing={4} alignItems="center" sx={{ maxWidth: 400 }}>
            <AlertTriangle size={64} color="#fbbf24" />
            <Stack spacing={1} alignItems="center">
              <Typography
                variant="h4"
                sx={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "white",
                }}
              >
                เกิดข้อผิดพลาด
              </Typography>
              <Typography
                sx={{ color: "rgba(255, 255, 255, 0.7)", textAlign: "center" }}
              >
                {error}
              </Typography>
            </Stack>
            <Button
              onClick={() => router.push("/prefs")}
              variant="contained"
              size="large"
              fullWidth
              sx={{
                py: 2,
                background: "linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)",
                borderRadius: 4,
                fontWeight: 600,
                "&:hover": {
                  background:
                    "linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)",
                },
              }}
            >
              กลับไปตั้งค่าใหม่
            </Button>
          </Stack>
        </Box>
      </Box>
    );
  }

  const hasMoreCards = currentIndex < destinations.length;
  const currentCard = destinations[currentIndex];
  const alreadyLiked = false; // Server handles like tracking

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        // backgroundColor: "white",
      }}
    >
      {/* Animated Background */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <Box
          component={motion.div}
          animate={{
            background: [
              "radial-gradient(circle at 20% 20%, rgba(168, 85, 247, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 40% 60%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      </Box>

      {/* Header */}
      <Box
        component={motion.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 2,
          pt: 4,
          px: 3,
          backgroundColor: "rgba(0, 0, 0, 0.1)",
          backdropFilter: "blur(20px)",
          flexShrink: 0,
        }}
      >
        <Box sx={{ width: 40 }} />

        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "white" }}>
            NextSpot
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "rgba(255, 255, 255, 0.7)" }}
          >
            {hasMoreCards
              ? `${destinations.length - currentIndex} สถานที่`
              : "หมดแล้ว!"}
          </Typography>
        </Box>

        <Box sx={{ width: 48 }} />
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          pt: 2,
        }}
      >
        {showGuestLimit ? (
          // Guest limit reached
          <Box
            component={motion.div}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 3,
            }}
          >
            <Stack spacing={6} alignItems="center" sx={{ maxWidth: 400 }}>
              <Stack spacing={4} alignItems="center">
                <Heart size={64} color="#ec4899" />
                <Stack spacing={2} alignItems="center">
                  <Typography
                    variant="h3"
                    sx={{
                      fontSize: "1.875rem",
                      fontWeight: "bold",
                      color: "white",
                      textAlign: "center",
                    }}
                  >
                    คุณได้ปัดครบ 5 ครั้งแล้ว!
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(255, 255, 255, 0.8)",
                      textAlign: "center",
                      lineHeight: 1.6,
                    }}
                  >
                    สร้างบัญชีหรือเข้าสู่ระบบเพื่อปัดต่อไปได้ไม่จำกัด
                    และบันทึกสถานที่ที่ชอบไว้ตลอดไป
                  </Typography>
                </Stack>
              </Stack>

              <Stack spacing={3} sx={{ width: "100%" }}>
                <Button
                  onClick={() => router.push("/register")}
                  variant="contained"
                  fullWidth
                  size="large"
                  sx={{
                    py: 2,
                    background:
                      "linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)",
                    color: "white",
                    fontWeight: 600,
                    borderRadius: 25,
                    textTransform: "none",
                    "&:hover": {
                      background:
                        "linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)",
                      transform: "scale(1.02)",
                    },
                  }}
                >
                  สร้างบัญชีใหม่
                </Button>

                <Button
                  onClick={() => router.push("/login")}
                  variant="outlined"
                  fullWidth
                  size="large"
                  sx={{
                    py: 2,
                    color: "white",
                    borderColor: "rgba(255, 255, 255, 0.3)",
                    fontWeight: 600,
                    borderRadius: 25,
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "rgba(255, 255, 255, 0.5)",
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                    },
                  }}
                >
                  เข้าสู่ระบบ
                </Button>
              </Stack>
            </Stack>
          </Box>
        ) : !hasMoreCards ? (
          // No more cards
          <Box
            component={motion.div}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Stack
              spacing={8}
              alignItems="center"
              sx={{ maxWidth: 384, mx: "auto" }}
            >
              <Stack spacing={4} alignItems="center">
                <Sparkles size={64} color="#f472b6" />
                <Stack spacing={1} alignItems="center">
                  <Typography
                    variant="h3"
                    sx={{
                      fontSize: "1.875rem",
                      fontWeight: "bold",
                      color: "white",
                    }}
                  >
                    เยี่ยมเลย!
                  </Typography>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
                    คุณได้ดูครบทุกสถานที่แล้ว
                  </Typography>
                </Stack>
              </Stack>

              <Stack spacing={4}>
                {allGone ? (
                  <>
                    <Paper
                      sx={{
                        p: 4,
                        borderRadius: 4,
                        bgcolor: "rgba(255, 255, 255, 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "rgba(255, 255, 255, 0.9)",
                        textAlign: "center",
                      }}
                    >
                      <Typography>
                        คุณได้ปัดครบตามตัวกรองแล้ว —
                        หรืออาจจะครบทุกสถานที่ในระบบ 🎉
                        <br />
                        กรุณาปรับตัวกรองเพื่อดูตัวเลือกใหม่ๆ
                      </Typography>
                    </Paper>
                    <Button
                      onClick={() => router.push("/prefs")}
                      fullWidth
                      sx={{
                        py: 2,
                        px: 6,
                        background:
                          "linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)",
                        color: "white",
                        fontWeight: 600,
                        borderRadius: 25,
                        textTransform: "none",
                        "&:hover": {
                          background:
                            "linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)",
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      ปรับตัวกรอง
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleContinueToResults}
                      fullWidth
                      sx={{
                        py: 3,
                        px: 6,
                        background:
                          "linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)",
                        color: "white",
                        fontWeight: 600,
                        borderRadius: 25,
                        textTransform: "none",
                        "&:hover": {
                          background:
                            "linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)",
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      ดูสถานที่ที่ชอบ
                    </Button>
                    <Button
                      onClick={handleLoadMore}
                      fullWidth
                      variant="outlined"
                      sx={{
                        py: 2,
                        px: 6,
                        border: "2px solid rgba(255, 255, 255, 0.3)",
                        color: "rgba(255, 255, 255, 0.9)",
                        fontWeight: 500,
                        borderRadius: 25,
                        textTransform: "none",
                        "&:hover": {
                          bgcolor: "rgba(255, 255, 255, 0.1)",
                          border: "2px solid rgba(255, 255, 255, 0.3)",
                        },
                      }}
                    >
                      ขอดูสถานที่เพิ่มเติม
                    </Button>
                  </>
                )}
              </Stack>
            </Stack>
          </Box>
        ) : (
          // Single card - responsive height
          // <Box
          //   sx={{
          //     position: "relative",
          //     flex: 1,
          //     display: "flex",
          //     alignItems: "center",
          //     justifyContent: "center",
          //     px: 2,
          //   }}
          // >
          <AnimatePresence mode="wait">
            {currentCard && (
              <SwipeCard
                key={currentCard.id}
                destination={currentCard}
                onSwipe={handleSwipe}
                onDetailTap={handleDetailTap}
                isTop={true}
                forceDirection={cardSwipeDirection}
              />
            )}
          </AnimatePresence>
          // </Box>
        )}
      </Box>

      {/* Bottom Controls - Fixed position above bottom nav */}
      {hasMoreCards && !showGuestLimit && (
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{
            position: "absolute",
            bottom: 70,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            zIndex: 10000,
          }}
        >
          <IconButton
            component={motion.button}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleButtonSwipe("left")}
            sx={{
              height: 56,
              width: 56,
              bgcolor: "white",
              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
              border: "2px solid #ef4444",
              "&:hover": {
                bgcolor: "#fef2f2",
                transform: "scale(1.05)",
              },
            }}
          >
            <X size={28} color="#ef4444" />
          </IconButton>

          <IconButton
            component={motion.button}
            whileHover={{ scale: alreadyLiked ? 1.0 : 1.1 }}
            whileTap={{ scale: alreadyLiked ? 1.0 : 0.9 }}
            onClick={() => !alreadyLiked && handleButtonSwipe("right")}
            disabled={alreadyLiked || isCardAnimating}
            sx={{
              height: 56,
              width: 56,
              background: "linear-gradient(135deg, #ec4899 0%, #ef4444 100%)",
              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
              border: "2px solid white",
              opacity: alreadyLiked ? 0.5 : 1,
              cursor: alreadyLiked ? "not-allowed" : "pointer",
              "&:hover": {
                transform: alreadyLiked ? "none" : "scale(1.05)",
              },
              "&:disabled": {
                opacity: 0.5,
              },
            }}
          >
            <Heart size={28} color="white" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
