"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Paper,
  Divider,
  Stack,
} from "@mui/material";
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Clock,
  Star,
  Heart,
  Share2,
  Phone,
  Globe,
  Navigation,
  ImageIcon,
} from "lucide-react";

interface RecommendationItem {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
  budgetBand: "low" | "mid" | "high";
  // Additional details for detail page
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
}

const budgetLabels = {
  low: "฿0-500",
  mid: "฿500-1,500",
  high: "฿1,500+",
};

const budgetColors = {
  low: "#22c55e",
  mid: "#f59e0b",
  high: "#ef4444",
};

// Mock data - In real app, this would come from your API
const mockDestination: RecommendationItem = {
  id: "1",
  nameTh: "คาเฟ่แสนสบาย",
  nameEn: "Cozy Corner Cafe",
  descTh:
    "คาเฟ่บรรยากาศดีในใจกลางเมือง เหมาะสำหรับทำงาน อ่านหนังสือ หรือนั่งชิลล์กับเพื่อน มีเมนูกาแฟหลากหลายและขนมอร่อยๆ พร้อมบริการ Wi-Fi ฟรี",
  imageUrl:
    "https://images.unsplash.com/photo-1414016642750-7fdd78dc33d9?w=800&h=600&fit=crop",
  tags: ["ชิลล์", "ทำงาน", "กาแฟ", "อ่านหนังสือ", "Wi-Fi"],
  budgetBand: "mid",
  address: "123 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500",
  phone: "02-123-4567",
  website: "www.cozycomercafe.com",
  openingHours: "จันทร์-อาทิตย์ 07:00-22:00",
  rating: 4.5,
  latitude: 13.7563,
  longitude: 100.5018,
};

export default function DestinationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [destination, setDestination] = useState<RecommendationItem | null>(
    null
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Mock destination images
  const mockImages = [
    "https://images.unsplash.com/photo-1414016642750-7fdd78dc33d9?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop",
  ];

  useEffect(() => {
    const fetchDestination = async () => {
      try {
        // First try to get from sessionStorage (passed from swipe page)
        const cachedDestinations = sessionStorage.getItem("swipe-destinations");
        if (cachedDestinations) {
          const destinations = JSON.parse(cachedDestinations);
          const foundDestination = destinations.find(
            (d: any) => d.id === params.id
          );

          if (foundDestination) {
            // Enhance with mock additional data for demo
            const enhancedDestination = {
              ...foundDestination,
              address: "123 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500",
              phone: "02-123-4567",
              website: "www.example.com",
              openingHours: "จันทร์-อาทิตย์ 07:00-22:00",
              rating: 4.5,
              latitude: 13.7563,
              longitude: 100.5018,
            };
            setDestination(enhancedDestination);
            setIsLoading(false);
            return;
          }
        }

        // Fallback to mock data if not found
        setTimeout(() => {
          const enhancedMockDestination = {
            ...mockDestination,
            id: params.id as string,
          };
          setDestination(enhancedMockDestination);
          setIsLoading(false);
        }, 500);
      } catch (error) {
        console.error("Error fetching destination:", error);
        setTimeout(() => {
          setDestination(mockDestination);
          setIsLoading(false);
        }, 500);
      }
    };

    fetchDestination();
  }, [params.id]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % mockImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + mockImages.length) % mockImages.length
    );
  };

  const handleShare = () => {
    if (navigator.share && destination) {
      navigator.share({
        title: destination.nameTh,
        text: destination.descTh,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleGetDirections = () => {
    if (destination?.latitude && destination?.longitude) {
      // Open in Google Maps
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`,
        "_blank"
      );
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          component={motion.div}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Typography sx={{ color: "white", fontSize: "1.125rem" }}>
            กำลังโหลด...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!destination) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <Typography variant="h5" sx={{ color: "white", textAlign: "center" }}>
            ไม่พบข้อมูลสถานที่
          </Typography>
          <Button
            onClick={() => router.back()}
            variant="contained"
            sx={{
              backgroundColor: "white",
              color: "#667eea",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.9)" },
            }}
          >
            กลับ
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      {/* Header with image */}
      <Box
        sx={{
          height: "50vh",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Background Image */}
        <Box
          component="img"
          src={mockImages[currentImageIndex]}
          alt={destination.nameTh}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Gradient overlay */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        {/* Navigation buttons */}
        {mockImages.length > 1 && (
          <>
            <IconButton
              onClick={prevImage}
              sx={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                backgroundColor: "rgba(0,0,0,0.5)",
                color: "white",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
              }}
            >
              <ArrowLeft size={20} />
            </IconButton>
            <IconButton
              onClick={nextImage}
              sx={{
                position: "absolute",
                right: 16,
                top: "50%",
                transform: "translateY(-50%)",
                backgroundColor: "rgba(0,0,0,0.5)",
                color: "white",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
              }}
            >
              <ArrowLeft size={20} style={{ transform: "rotate(180deg)" }} />
            </IconButton>
          </>
        )}

        {/* Image indicators */}
        {mockImages.length > 1 && (
          <Box
            sx={{
              position: "absolute",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 1,
            }}
          >
            {mockImages.map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor:
                    index === currentImageIndex
                      ? "white"
                      : "rgba(255,255,255,0.5)",
                  transition: "background-color 0.2s",
                }}
              />
            ))}
          </Box>
        )}

        {/* Top controls */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            pt: 6,
          }}
        >
          <IconButton
            onClick={() => router.back()}
            sx={{
              backgroundColor: "rgba(0,0,0,0.5)",
              color: "white",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
            }}
          >
            <ArrowLeft size={24} />
          </IconButton>

          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              onClick={handleShare}
              sx={{
                backgroundColor: "rgba(0,0,0,0.5)",
                color: "white",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
              }}
            >
              <Share2 size={20} />
            </IconButton>
            <IconButton
              sx={{
                backgroundColor: "rgba(0,0,0,0.5)",
                color: "white",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
              }}
            >
              <Heart size={20} />
            </IconButton>
          </Box>
        </Box>

        {/* Bottom content */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            p: 3,
          }}
        >
          <Stack spacing={2}>
            {/* Budget and rating */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Chip
                icon={<DollarSign size={16} />}
                label={budgetLabels[destination.budgetBand]}
                sx={{
                  backgroundColor: budgetColors[destination.budgetBand],
                  color: "white",
                  fontWeight: 600,
                }}
              />
              {destination.rating && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Star size={16} color="#fbbf24" fill="#fbbf24" />
                  <Typography sx={{ color: "white", fontWeight: 600 }}>
                    {destination.rating}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Title */}
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "white",
                  lineHeight: 1.2,
                  textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                }}
              >
                {destination.nameTh}
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontSize: "1.125rem",
                  color: "rgba(255,255,255,0.9)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                {destination.nameEn}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3, pb: 10 }}>
        <Stack spacing={3}>
          {/* Description */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              เกี่ยวกับสถานที่
            </Typography>
            <Typography sx={{ lineHeight: 1.7, color: "#4b5563" }}>
              {destination.descTh}
            </Typography>
          </Paper>

          {/* Tags */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              บรรยากาศ
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {destination.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  variant="outlined"
                  sx={{
                    borderColor: "#e5e7eb",
                    "&:hover": { backgroundColor: "#f3f4f6" },
                  }}
                />
              ))}
            </Box>
          </Paper>

          {/* Contact Info */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              ข้อมูลติดต่อ
            </Typography>
            <Stack spacing={2}>
              {destination.address && (
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                  <MapPin size={20} color="#6b7280" />
                  <Typography sx={{ color: "#4b5563", flex: 1 }}>
                    {destination.address}
                  </Typography>
                </Box>
              )}
              {destination.phone && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Phone size={20} color="#6b7280" />
                  <Typography sx={{ color: "#4b5563" }}>
                    {destination.phone}
                  </Typography>
                </Box>
              )}
              {destination.website && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Globe size={20} color="#6b7280" />
                  <Typography sx={{ color: "#4b5563" }}>
                    {destination.website}
                  </Typography>
                </Box>
              )}
              {destination.openingHours && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Clock size={20} color="#6b7280" />
                  <Typography sx={{ color: "#4b5563" }}>
                    {destination.openingHours}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>

          {/* Action buttons */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              onClick={handleGetDirections}
              variant="contained"
              startIcon={<Navigation size={20} />}
              fullWidth
              sx={{
                height: 48,
                borderRadius: 3,
                backgroundColor: "#3b82f6",
                "&:hover": { backgroundColor: "#2563eb" },
              }}
            >
              เส้นทาง
            </Button>
            {/* <Button
              variant="outlined"
              startIcon={<Phone size={20} />}
              fullWidth
              sx={{
                height: 48,
                borderRadius: 3,
                borderColor: "#d1d5db",
                color: "#374151",
                "&:hover": {
                  borderColor: "#9ca3af",
                  backgroundColor: "#f9fafb",
                },
              }}
            >
              โทร
            </Button> */}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
