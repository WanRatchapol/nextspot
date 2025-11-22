"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Box, Typography, Button, Paper } from "@mui/material";
import {
  fireLandingPageView,
  fireCtaClick,
  hasActiveSession,
  createSession,
} from "@/utils/analytics";
import { Compass, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ModernLoader from "@/components/ModernLoader";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useEffect(() => {
    fireLandingPageView();

    // Check if user has seen intro and has active session
    const hasSeenIntro = localStorage.getItem("nextspot-intro-seen");
    const hasActiveSessionCookie = document.cookie.includes("sid=");

    // If user hasn't seen intro, redirect to intro page
    if (!hasSeenIntro) {
      router.push("/intro");
      return;
    }

    // If user is authenticated, go to swipe page (new home)
    if (user || hasActiveSessionCookie) {
      router.push("/swipe");
      return;
    }

    // For returning users without authentication, show auth options
    // (they stay on this page to choose login/register/guest)
  }, [user, loading, router]);

  const handleContinueAsGuest = async () => {
    setIsCreatingSession(true);
    fireCtaClick("ข้ามไปใช้งานแบบไม่ลงทะเบียน", "/prefs");

    try {
      // Mark that user has visited the app
      localStorage.setItem("nextspot-visited", "true");

      if (!hasActiveSession()) {
        const sessionId = await createSession();
        if (!sessionId) {
          console.error("Failed to create session, proceeding anyway");
        }
      }

      router.push("/prefs");
    } catch (error) {
      console.error("Error handling guest continuation:", error);
      router.push("/prefs");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const navigateToAuth = (mode: "login" | "register") => {
    router.push(`/${mode}`);
  };

  // Show loading state while auth is loading
  if (loading) {
    return (
      <Box
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
        }}
      >
        <ModernLoader size={72} label="กำลังเตรียมข้อมูล..." />
      </Box>
    );
  }

  // Show auth options for users who completed intro
  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        px: 3,
        py: 2,
      }}
    >
      {/* Animated Background */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="gradient-pink-purple"
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.9,
          }}
        />
      </Box>

      {/* Header */}
      <Box
        sx={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 2,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Paper
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Compass size={20} color="black" />
            </Paper>
            <Typography
              variant="h6"
              sx={{
                color: "white",
                fontWeight: 700,
                letterSpacing: "-0.025em",
              }}
            >
              NextSpot
            </Typography>
          </Box>
        </motion.div>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
          position: "relative",
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ textAlign: "center", maxWidth: 400, width: "100%" }}
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: 0.2,
              duration: 0.8,
              type: "spring",
              bounce: 0.4,
            }}
          >
            <Paper
              sx={{
                width: 96,
                height: 96,
                borderRadius: 6,
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 4rem auto",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
                color: "white",
              }}
            >
              <Heart size={48} />
            </Paper>
          </motion.div>

          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: "1.875rem", sm: "2rem" },
                  fontWeight: 700,
                  color: "white",
                  mb: 1,
                  lineHeight: 1.2,
                }}
              >
                ยินดีต้อนรับสู่ NextSpot
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: "1.125rem", sm: "1.25rem" },
                  fontWeight: 500,
                  color: "rgba(255, 255, 255, 0.9)",
                  lineHeight: 1.4,
                }}
              >
                ค้นหาสถานที่ที่ใช่สำหรับคุณ
              </Typography>
            </Box>

            <Typography
              variant="body1"
              sx={{
                color: "rgba(255, 255, 255, 0.8)",
                lineHeight: 1.6,
                px: 1,
              }}
            >
              สร้างบัญชีเพื่อบันทึกสถานที่ที่ชอบและแชร์กับเพื่อน
              หรือเริ่มใช้งานแบบไม่ลงทะเบียนก่อน
            </Typography>
          </motion.div>
        </motion.div>
      </Box>

      {/* Bottom Section */}
      <Box
        sx={{
          position: "relative",
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Button
              onClick={() => navigateToAuth("register")}
              disabled={isCreatingSession}
              variant="contained"
              fullWidth
              size="large"
              sx={{
                height: 44,
                backgroundColor: "white",
                color: "white",
                fontWeight: 600,
                fontSize: "1.125rem",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                "&:hover": {
                  backgroundColor: "#f3f4f6",
                },
                "&:disabled": {
                  opacity: 0.5,
                  backgroundColor: "rgba(255, 255, 255, 0.5)",
                  cursor: "not-allowed",
                },
              }}
            >
              สร้างบัญชีใหม่
            </Button>

            <Button
              onClick={() => navigateToAuth("login")}
              disabled={isCreatingSession}
              variant="outlined"
              fullWidth
              size="large"
              sx={{
                height: 44,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(10px)",
                color: "white",
                fontWeight: 600,
                fontSize: "1.125rem",
                borderColor: "rgba(255, 255, 255, 0.3)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                  borderColor: "rgba(255, 255, 255, 0.5)",
                },
                "&:disabled": {
                  opacity: 0.5,
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  cursor: "not-allowed",
                },
              }}
            >
              เข้าสู่ระบบ
            </Button>

            <Button
              onClick={handleContinueAsGuest}
              disabled={isCreatingSession}
              variant="text"
              fullWidth
              sx={{
                py: 1.5,
                px: 2,
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "0.875rem",
                "&:hover": {
                  color: "white",
                  backgroundColor: "transparent",
                },
                "&:disabled": {
                  opacity: 0.5,
                },
              }}
            >
              {isCreatingSession
                ? "กำลังเตรียม..."
                : "ข้ามไปใช้งานแบบไม่ลงทะเบียน"}
            </Button>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
}
