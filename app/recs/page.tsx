"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Star,
  Share2,
  Heart,
  Navigation,
  Map,
  Grid3X3,
  MapPin,
  ExternalLink,
  X,
} from "lucide-react";
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardMedia,
  CardContent,
  Chip,
  Modal,
  Backdrop,
} from "@mui/material";
import dynamic from "next/dynamic";
import ModernLoader from "@/components/ModernLoader";

const DestinationMap = dynamic(() => import("@/components/DestinationMap"), {
  ssr: false,
  loading: () => <ModernLoader size={40} label="กำลังโหลดแผนที่..." />,
});

import type { DestinationItem } from "@/components/DestinationMap";

type LikedDestinationItem = {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
  likedAt?: string | Date;
  // Location data from database
  latitude?: number;
  longitude?: number;
  address?: string;
  district?: string;
};

type LikedListResponse = {
  destinations: LikedDestinationItem[];
  count: number;
  // sessionTiming, metadata, etc. exist but we don't need them here
};

export default function RecommendationsPage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<
    LikedDestinationItem[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<LikedDestinationItem | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "distance" | "district">(
    "recent"
  );
  const [showRoute, setShowRoute] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<LikedDestinationItem[]>(
    []
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      const cookies = document.cookie.split(";");
      const sidCookie = cookies.find((cookie) =>
        cookie.trim().startsWith("sid=")
      );
      if (sidCookie) {
        setSessionId(sidCookie.split("=")[1]);
      }
    }
  }, []);

  useEffect(() => {
    const fetchLiked = async () => {
      if (!sessionId) {
        setError("Session not found. Please start from the beginning.");
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/sessions/${sessionId}/liked`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(
            err?.error?.message || "Failed to load liked destinations"
          );
        }

        const data: LikedListResponse = await res.json();
        // Map destinations (they now come with coordinates from database)
        const seenIds = new Set<string>();
        const enrichedDestinations: LikedDestinationItem[] = [];

        for (const item of data.destinations ?? []) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            // Destinations now come with real coordinates from database
            const enrichedItem: LikedDestinationItem = {
              ...item,
              // Use coordinates from database, fallback to Bangkok center if needed
              latitude: item.latitude || 13.7563,
              longitude: item.longitude || 100.5018,
              address: item.address || "Bangkok, Thailand",
              district: item.district || "Unknown",
            };
            enrichedDestinations.push(enrichedItem);
          }
        }

        setRecommendations(enrichedDestinations);

        if (process.env.NODE_ENV === "development") {
          console.log("[Analytics] liked_page_view:", {
            sessionId,
            count: data.count,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        console.error("Error fetching liked destinations:", e);
        setError(
          e instanceof Error ? e.message : "Failed to load liked destinations"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      fetchLiked();
    }
  }, [sessionId]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    const currentSessionId = sessionId;
    setSessionId(null);
    if (typeof window !== "undefined") {
      setTimeout(() => setSessionId(currentSessionId), 100);
    }
  };

  // Utility functions for trip planning
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const optimizeRoute = (destinations: LikedDestinationItem[]) => {
    if (destinations.length <= 1) return destinations;

    // Simple nearest neighbor algorithm for route optimization
    const unvisited = [...destinations];
    const route = [unvisited.shift()!];

    while (unvisited.length > 0) {
      const current = route[route.length - 1];
      if (!current.latitude || !current.longitude) {
        route.push(unvisited.shift()!);
        continue;
      }

      let nearest = 0;
      let minDistance = Infinity;

      unvisited.forEach((dest, index) => {
        if (dest.latitude && dest.longitude) {
          const distance = calculateDistance(
            current.latitude!,
            current.longitude!,
            dest.latitude,
            dest.longitude
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearest = index;
          }
        }
      });

      route.push(unvisited.splice(nearest, 1)[0]);
    }

    return route;
  };

  const getUniqueDistricts = () => {
    const districts = recommendations
      .map((r) => r.district)
      .filter(Boolean)
      .filter((d, i, arr) => arr.indexOf(d) === i)
      .sort();
    return districts;
  };

  const filteredAndSortedRecommendations = () => {
    let filtered = recommendations;

    // Filter by district
    if (selectedDistrict !== "all") {
      filtered = filtered.filter((r) => r.district === selectedDistrict);
    }

    // Sort
    switch (sortBy) {
      case "recent":
        return filtered.sort(
          (a, b) =>
            new Date(b.likedAt || 0).getTime() -
            new Date(a.likedAt || 0).getTime()
        );
      case "district":
        return filtered.sort((a, b) =>
          (a.district || "").localeCompare(b.district || "")
        );
      case "distance":
        // Sort by distance from Bangkok center (13.7563, 100.5018)
        return filtered.sort((a, b) => {
          if (!a.latitude || !a.longitude) return 1;
          if (!b.latitude || !b.longitude) return -1;

          const distA = calculateDistance(
            13.7563,
            100.5018,
            a.latitude,
            a.longitude
          );
          const distB = calculateDistance(
            13.7563,
            100.5018,
            b.latitude,
            b.longitude
          );
          return distA - distB;
        });
      default:
        return filtered;
    }
  };

  const handleShare = () => {
    const shareText = `สถานที่ที่ฉันกดถูกใจ ${
      recommendations.length
    } ที่ 🎉\n\n${recommendations
      .map((rec) => `• ${rec.nameTh}`)
      .join("\n")}\n\nจาก NextSpot`;

    if (typeof navigator !== "undefined") {
      if (navigator.share) {
        navigator.share({
          title: "รายการถูกใจ - NextSpot",
          text: shareText,
        });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText);
      }
    }
  };

  const handleOptimizeRoute = () => {
    const optimized = optimizeRoute(filteredAndSortedRecommendations());
    setOptimizedRoute(optimized);
    setShowRoute(true);
  };

  const handleExportToGoogleMaps = () => {
    const routeToUse =
      showRoute && optimizedRoute.length > 0
        ? optimizedRoute
        : filteredAndSortedRecommendations();

    const waypoints = routeToUse
      .filter((dest) => dest.latitude && dest.longitude)
      .map((dest) => `${dest.latitude},${dest.longitude}`)
      .join("/");

    if (waypoints && typeof window !== "undefined") {
      const googleMapsUrl = `https://www.google.com/maps/dir/${waypoints}`;
      window.open(googleMapsUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Box
            sx={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <ModernLoader size={88} label="กำลังรวบรวมรายการของคุณ..." />
            {/* <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "white",
                }}
              >
                กำลังโหลด...
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                }}
              >
                เตรียมรายการสถานที่ที่คุณถูกใจ
              </Typography>
            </Box> */}
          </Box>
        </motion.div>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Box
            sx={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <AlertTriangle
              size={64}
              style={{ color: "#fbbf24", margin: "0 auto" }}
            />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
                variant="body1"
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                }}
              >
                {error}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Button
                onClick={handleRetry}
                variant="contained"
                fullWidth
                sx={{
                  py: 1.5,
                  px: 3,
                  background:
                    "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                  color: "white",
                  fontWeight: 600,
                  borderRadius: 4,
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #be185d 0%, #7c3aed 100%)",
                    transform: "scale(1.05)",
                  },
                }}
              >
                ลองอีกครั้ง
              </Button>
              <Button
                onClick={() => router.push("/swipe")}
                variant="outlined"
                fullWidth
                sx={{
                  py: 1.5,
                  px: 3,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  color: "rgba(255, 255, 255, 0.9)",
                  fontWeight: 500,
                  borderRadius: 4,
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderColor: "rgba(255, 255, 255, 0.3)",
                  },
                }}
              >
                กลับไปเลือกสถานที่ใหม่
              </Button>
            </Box>
          </Box>
        </motion.div>
      </Box>
    );
  }

  const isEmpty = recommendations.length === 0;
  const displayRecommendations = filteredAndSortedRecommendations();
  const districts = getUniqueDistricts();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#000000",
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Box
          sx={{
            left: 0,
            right: 0,
            backgroundColor: "#111827",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
            borderBottom: "1px solid #374151",
            position: "fixed",
            top: 0,
            zIndex: 1000,
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    รายการที่ถูกใจ
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: "0.875rem",
                      color: "#d1d5db",
                    }}
                  >
                    {displayRecommendations.length} สถานที่
                    {selectedDistrict !== "all" && ` ใน${selectedDistrict}`}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {!isEmpty && (
                  <>
                    <IconButton
                      onClick={handleExportToGoogleMaps}
                      title="เปิดใน Google Maps"
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: "#065f46",
                        "&:hover": {
                          backgroundColor: "#047857",
                        },
                      }}
                    >
                      <ExternalLink size={20} style={{ color: "#10b981" }} />
                    </IconButton>
                    <IconButton
                      onClick={handleShare}
                      sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: "#1f2937",
                        "&:hover": {
                          backgroundColor: "#374151",
                        },
                      }}
                    >
                      <Share2 size={20} style={{ color: "#60a5fa" }} />
                    </IconButton>
                  </>
                )}
              </Box>
            </Box>

            {/* Controls */}
            {!isEmpty && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "stretch", sm: "center" },
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                {/* View Mode Toggle */}
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, newMode) => newMode && setViewMode(newMode)}
                  sx={{
                    backgroundColor: "#374151",
                    borderRadius: 2,
                    p: 0.5,
                    "& .MuiToggleButton-root": {
                      width: "100%",
                      border: "none",
                      borderRadius: 1.5,
                      px: 2,
                      py: 1,
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#d1d5db",
                      "&.Mui-selected": {
                        backgroundColor: "#111827",
                        color: "#ffffff",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
                      },
                      "&:hover": {
                        backgroundColor: "#111827",
                        color: "#ffffff",
                      },
                    },
                  }}
                >
                  <ToggleButton value="grid">
                    <Grid3X3 size={16} style={{ marginRight: 8 }} />
                    รายการ
                  </ToggleButton>
                  <ToggleButton value="map">
                    <Map size={16} style={{ marginRight: 8 }} />
                    แผนที่
                  </ToggleButton>
                </ToggleButtonGroup>

                {/* Filters */}
                {/* <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "stretch", sm: "center" },
                    gap: 1.5,
                    minWidth: 0, // Prevent overflow
                  }}
                > */}
                {/* District Filter */}
                {/* {districts.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        sx={{
                          px: 1.5,
                          py: 1,
                          backgroundColor: "#374151",
                          borderRadius: 2,
                          fontSize: "0.875rem",
                          border: "none",
                          color: "#ffffff",
                          "& .MuiOutlinedInput-notchedOutline": {
                            border: "none",
                          },
                          "&:focus": {
                            boxShadow: "0 0 0 2px #3b82f6",
                          },
                          "& .MuiSvgIcon-root": {
                            color: "#ffffff",
                          },
                        }}
                      >
                        <MenuItem value="all">ทุกเขต</MenuItem>
                        {districts.map((district) => (
                          <MenuItem key={district} value={district}>
                            {district}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )} */}

                {/* Sort */}
                {/* <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      sx={{
                        px: 1.5,
                        py: 1,
                        backgroundColor: "#374151",
                        borderRadius: 2,
                        fontSize: "0.875rem",
                        border: "none",
                        color: "#ffffff",
                        "& .MuiOutlinedInput-notchedOutline": {
                          border: "none",
                        },
                        "&:focus": {
                          boxShadow: "0 0 0 2px #3b82f6",
                        },
                        "& .MuiSvgIcon-root": {
                          color: "#ffffff",
                        },
                      }}
                    >
                      <MenuItem value="recent">ล่าสุด</MenuItem>
                      <MenuItem value="district">เขต</MenuItem>
                      <MenuItem value="distance">ระยะทาง</MenuItem>
                    </Select>
                  </FormControl> */}
              </Box>
            )}
          </Box>
        </Box>
      </motion.div>

      {/* Content */}
      <Box sx={{ px: 3, pb: 16, pt: 20 }}>
        {/* Summary / Empty */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Paper
            sx={{
              backgroundColor: "#111827",
              borderRadius: 4,
              p: 3,
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
              border: "1px solid #374151",
              mb: 3,
            }}
          >
            {isEmpty ? (
              <Box
                sx={{
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    color: "#ffffff",
                  }}
                >
                  ยังไม่มีรายการถูกใจ
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: "#6b7280",
                  }}
                >
                  กลับไปปัดการ์ดเพื่อเลือกสถานที่ที่ชอบ แล้วกลับมาดูที่นี่ได้เลย
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 1.5,
                    pt: 1,
                  }}
                >
                  <Button
                    onClick={() => router.push("/swipe")}
                    variant="contained"
                    sx={{
                      px: 2.5,
                      py: 1.5,
                      background:
                        "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                      color: "white",
                      borderRadius: 3,
                      fontWeight: 500,
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, #be185d 0%, #7c3aed 100%)",
                      },
                    }}
                  >
                    ไปหน้าปัดการ์ด
                  </Button>
                  <Button
                    onClick={() => router.push("/prefs")}
                    variant="outlined"
                    sx={{
                      px: 2.5,
                      py: 1.5,
                      borderColor: "#475569",
                      color: "#ffffff",
                      borderRadius: 3,
                      fontWeight: 500,
                      "&:hover": {
                        backgroundColor: "#374151",
                        borderColor: "#475569",
                      },
                    }}
                  >
                    แก้ไขความต้องการ
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: "1.125rem",
                      fontWeight: 600,
                      color: "#ffffff",
                    }}
                  >
                    รายการของคุณพร้อมแล้ว
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#d1d5db",
                    }}
                  >
                    สถานที่ที่คุณกดถูกใจทั้งหมด
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    width: 48,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    backgroundColor: "#1f2937",
                  }}
                >
                  <Heart size={24} style={{ color: "#a855f7" }} />
                </Box>
              </Box>
            )}
          </Paper>
        </motion.div>

        {/* Map View */}
        {!isEmpty && viewMode === "map" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <DestinationMap
              destinations={displayRecommendations as DestinationItem[]}
              onDestinationClick={(destination) => setSelectedCard(destination)}
              onExportToGoogleMaps={handleExportToGoogleMaps}
              onOptimizeRoute={handleOptimizeRoute}
              showRoute={showRoute}
              optimizedRoute={optimizedRoute as DestinationItem[]}
            />

            {/* Route Toggle Controls */}
            {displayRecommendations.length > 1 && (
              <Paper
                sx={{
                  mt: 3,
                  backgroundColor: "white",
                  borderRadius: 3,
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                  border: "1px solid #e5e7eb",
                  p: 3,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "#374151",
                      }}
                    >
                      แสดงเส้นทาง:
                    </Typography>
                    <Button
                      onClick={() => setShowRoute(!showRoute)}
                      variant={showRoute ? "contained" : "outlined"}
                      size="small"
                      sx={{
                        px: 2,
                        py: 0.5,
                        borderRadius: 2,
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        textTransform: "none",
                        ...(showRoute
                          ? {
                              backgroundColor: "#3b82f6",
                              color: "white",
                              "&:hover": {
                                backgroundColor: "#2563eb",
                              },
                            }
                          : {
                              borderColor: "#d1d5db",
                              color: "#374151",
                              backgroundColor: "#f3f4f6",
                              "&:hover": {
                                backgroundColor: "#e5e7eb",
                                borderColor: "#d1d5db",
                              },
                            }),
                      }}
                    >
                      {showRoute ? "ซ่อนเส้นทาง" : "แสดงเส้นทาง"}
                    </Button>
                  </Box>

                  {showRoute && optimizedRoute.length > 0 && (
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                      }}
                    >
                      เส้นทางที่ปรับให้เหมาะสม ({optimizedRoute.length} จุด)
                    </Typography>
                  )}
                </Box>
              </Paper>
            )}
          </motion.div>
        )}

        {/* Grid */}
        {!isEmpty && viewMode === "grid" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 3,
              }}
            >
              {displayRecommendations.map((item, index) => (
                <Box key={item.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + index * 0.03 }}
                  >
                    <Card
                      sx={{
                        backgroundColor: "#111827",
                        borderRadius: 4,
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
                        border: "1px solid #374151",
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "box-shadow 0.2s ease-in-out",
                        "&:hover": {
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.5)",
                        },
                      }}
                      onClick={() => setSelectedCard(item)}
                    >
                      <Box sx={{ position: "relative", height: 192 }}>
                        <CardMedia
                          component="img"
                          height="192"
                          image={item.imageUrl}
                          alt={item.nameTh}
                          sx={{
                            height: 192,
                            objectFit: "cover",
                            backgroundColor: "#f3f4f6",
                          }}
                          onError={(e: any) => {
                            e.currentTarget.src =
                              "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop";
                          }}
                        />
                        <Box
                          sx={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "linear-gradient(to top, rgba(0,0,0,0.4), transparent 40%)",
                          }}
                        />
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: 12,
                            left: 12,
                          }}
                        >
                          <Chip
                            label={item.nameEn}
                            sx={{
                              backgroundColor: "rgba(0, 0, 0, 0.5)",
                              backdropFilter: "blur(4px)",
                              color: "white",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              height: 24,
                            }}
                          />
                        </Box>
                      </Box>

                      <CardContent sx={{ p: 3 }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <Box>
                            <Typography
                              variant="h6"
                              sx={{
                                fontSize: "1.125rem",
                                fontWeight: 600,
                                color: "#ffffff",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.nameTh}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: "#d1d5db",
                                fontSize: "0.875rem",
                                mt: 0.5,
                                overflow: "hidden",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {item.descTh}
                            </Typography>
                            {item.district && (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  mt: 1,
                                }}
                              >
                                <MapPin
                                  size={12}
                                  style={{ color: "#9ca3af" }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: "0.75rem",
                                    color: "#d1d5db",
                                  }}
                                >
                                  {item.district}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          <Box
                            sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                          >
                            {item.tags.slice(0, 3).map((tag, tagIndex) => (
                              <Chip
                                key={tagIndex}
                                icon={<Star size={12} />}
                                label={tag}
                                sx={{
                                  backgroundColor: "#374151",
                                  color: "#ffffff",
                                  fontSize: "0.75rem",
                                  height: 24,
                                  "& .MuiChip-icon": {
                                    color: "#ffffff",
                                    fontSize: "0.75rem",
                                  },
                                }}
                              />
                            ))}
                            {item.tags.length > 3 && (
                              <Chip
                                label={`+${item.tags.length - 3}`}
                                sx={{
                                  backgroundColor: "#374151",
                                  color: "#d1d5db",
                                  fontSize: "0.75rem",
                                  height: 24,
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Box>
              ))}
            </Box>
          </motion.div>
        )}
      </Box>

      {/* Fixed Bottom Actions */}
      {/* <Paper
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "white",
          borderTop: "1px solid #e5e7eb",
          p: 3,
          zIndex: 50,
        }}
      >
        <Box
          sx={{
            maxWidth: "512px",
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              onClick={() => router.push("/prefs")}
              variant="outlined"
              fullWidth
              startIcon={<RotateCcw size={16} />}
              sx={{
                px: 3,
                py: 2,
                borderColor: "#d1d5db",
                color: "#374151",
                borderRadius: 3,
                fontWeight: 500,
                "&:hover": {
                  backgroundColor: "#f9fafb",
                  borderColor: "#d1d5db",
                },
              }}
            >
              แก้ไขความต้องการ
            </Button>
            <Button
              onClick={() => router.push("/")}
              variant="contained"
              fullWidth
              startIcon={<Home size={16} />}
              sx={{
                px: 3,
                py: 2,
                background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                color: "white",
                borderRadius: 3,
                fontWeight: 500,
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #be185d 0%, #7c3aed 100%)",
                },
              }}
            >
              เสร็จสิ้น
            </Button>
          </Box>
          <Typography
            variant="caption"
            sx={{
              textAlign: "center",
              fontSize: "0.75rem",
              color: "#6b7280",
            }}
          >
            แสดง {recommendations.length} สถานที่ (จากรายการที่คุณถูกใจ)
          </Typography>
        </Box>
      </Paper> */}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCard && (
          <Modal
            open={!!selectedCard}
            onClose={() => setSelectedCard(null)}
            closeAfterTransition
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 2,
            }}
            slots={{ backdrop: Backdrop }}
            slotProps={{
              backdrop: {
                sx: {
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                },
              },
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
            >
              <Paper
                sx={{
                  backgroundColor: "#111827",
                  borderRadius: 4,
                  maxWidth: 512,
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                  outline: "none",
                  position: "relative",
                  zIndex: 1301,
                  isolation: "isolate",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Box sx={{ position: "relative", height: 256 }}>
                  <CardMedia
                    component="img"
                    height="256"
                    image={selectedCard.imageUrl}
                    alt={selectedCard.nameTh}
                    sx={{
                      height: 256,
                      objectFit: "cover",
                      backgroundColor: "#f3f4f6",
                    }}
                    onError={(e: any) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop";
                    }}
                  />
                  <IconButton
                    onClick={() => setSelectedCard(null)}
                    sx={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      width: 32,
                      height: 32,
                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                      backdropFilter: "blur(4px)",
                      color: "white",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                      },
                    }}
                  >
                    <X size={16} />
                  </IconButton>
                </Box>

                <Box
                  sx={{
                    p: 4,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <Box>
                    <Typography
                      variant="h4"
                      sx={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "#ffffff",
                        mb: 0.5,
                      }}
                    >
                      {selectedCard.nameTh}
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: "1.125rem",
                        color: "#d1d5db",
                      }}
                    >
                      {selectedCard.nameEn}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body1"
                    sx={{
                      color: "#d1d5db",
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedCard.descTh}
                  </Typography>

                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {selectedCard.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        icon={<Star size={12} />}
                        label={tag}
                        sx={{
                          backgroundColor: "#374151",
                          color: "#ffffff",
                          fontSize: "0.875rem",
                          "& .MuiChip-icon": {
                            color: "#ffffff",
                          },
                        }}
                      />
                    ))}
                  </Box>

                  {/* <Box sx={{ display: "flex", gap: 2, pt: 2 }}>
                    <Button
                      onClick={() => {
                        console.log("Navigate to:", selectedCard.nameTh);
                      }}
                      variant="contained"
                      fullWidth
                      startIcon={<Navigation size={16} />}
                      sx={{
                        px: 3,
                        py: 1.5,
                        backgroundColor: "#3b82f6",
                        color: "white",
                        borderRadius: 3,
                        fontWeight: 500,
                        textTransform: "none",
                        "&:hover": {
                          backgroundColor: "#2563eb",
                        },
                      }}
                    >
                      นำทาง
                    </Button>
                    <Button
                      onClick={() => setSelectedCard(null)}
                      variant="outlined"
                      sx={{
                        px: 3,
                        py: 1.5,
                        borderColor: "#475569",
                        color: "#ffffff",
                        borderRadius: 3,
                        fontWeight: 500,
                        textTransform: "none",
                        "&:hover": {
                          backgroundColor: "#374151",
                          borderColor: "#475569",
                        },
                      }}
                    >
                      ปิด
                    </Button>
                  </Box> */}
                </Box>
              </Paper>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </Box>
  );
}
