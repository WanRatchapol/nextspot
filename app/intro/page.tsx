"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Box, Typography, Button, LinearProgress, Paper } from "@mui/material";
import {
  Compass,
  Heart,
  Users,
  ArrowRight,
  Zap,
  SkipForward,
} from "lucide-react";

const introSteps = [
  {
    id: 1,
    icon: <Compass size={48} color={"black"} />,
    title: "ค้นหาสถานที่ใหม่",
    subtitle: "แบบที่คุณไม่เคยเจอมาก่อน",
    description:
      "ค้นหาสถานที่ที่ตรงกับสไตล์และงบประมาณของคุณ ไม่ว่าจะเป็นคาเฟ่ลับ ร้านอาหารเด็ด หรือสถานที่ท่องเที่ยวใหม่",
    color: "gradient-pink-rose",
  },
  {
    id: 2,
    icon: <Heart size={48} color={"black"} />,
    title: "สไลด์เหมือนหาคู่",
    subtitle: "แต่สำหรับสถานที่",
    description:
      "ปัดขวาที่ชอบ ปัดซ้ายข้าม ง่ายและสนุกเหมือนแอพหาคู่ที่คุณคุ้นเคย แต่เป็นการหาสถานที่แทน",
    color: "gradient-orange-red",
  },
  {
    id: 3,
    icon: <Users size={48} color={"black"} />,
    title: "แชร์กับเพื่อน",
    subtitle: "วางแผนด้วยกัน",
    description:
      "สร้างลิสต์โปรดแล้วแชร์กับเพื่อน วางแผนเที่ยวหรือนัดกินข้าวด้วยกันได้ทันที พร้อมดูระยะทางและเวลาเดินทาง",
    color: "gradient-blue-purple",
  },
];

export default function IntroPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has already seen the intro
    const hasSeenIntro = localStorage.getItem("nextspot-intro-seen");

    if (hasSeenIntro) {
      // If user has already seen intro, redirect to home page
      router.replace("/");
      return;
    }

    // Add a global reset function for development
    if (typeof window !== "undefined") {
      (window as any).resetIntroFlow = () => {
        localStorage.removeItem("nextspot-intro-seen");
        localStorage.removeItem("nextspot-visited");
        console.log("Intro flow reset! Refresh page to see intro again.");
      };
    }
  }, [router]);

  const handleNext = () => {
    if (currentStep < introSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark that user has completed the intro
      localStorage.setItem("nextspot-intro-seen", "true");

      // After intro, redirect to main landing page
      router.push("/");
    }
  };

  const handleSkip = () => {
    // Mark that user has seen the intro (even if skipped)
    localStorage.setItem("nextspot-intro-seen", "true");

    router.push("/");
  };

  const currentStepData = introSteps[currentStep];
  const isLastStep = currentStep === introSteps.length - 1;
  const progress = ((currentStep + 1) / introSteps.length) * 100;

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
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
          zIndex: 0,
        }}
      >
        <motion.div
          key={currentStep}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={currentStepData.color}
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.2,
          }}
        />

        {/* Floating elements */}
        <Box sx={{ position: "absolute", inset: 0 }}>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`${currentStep}-${i}`}
              initial={{ y: "100vh", opacity: 0, scale: 0 }}
              animate={{
                y: [null, "-20vh", "-40vh"],
                opacity: [0, 0.6, 0],
                scale: [0, 1, 0.8],
                x: Math.sin(i) * 100,
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeOut",
              }}
              className={currentStepData.color}
              style={{
                position: "absolute",
                width: 64,
                height: 64,
                borderRadius: "50%",
                filter: "blur(20px)",
                left: `${10 + i * 15}%`,
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Header */}
      <Box
        sx={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 2,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
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

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Button
            onClick={handleSkip}
            variant="text"
            sx={{
              color: "white",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              },
            }}
            startIcon={<SkipForward size={20} />}
          >
            ข้าม
          </Button>
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
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 1.1 }}
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
                className={currentStepData.color}
                sx={{
                  width: 96,
                  height: 96,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 4rem auto",
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
                  color: "white",
                }}
              >
                {currentStepData.icon}
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
                    fontSize: { xs: "1.75rem", sm: "2rem" },
                    fontWeight: 700,
                    color: "white",
                    mb: 1,
                    lineHeight: 1.2,
                  }}
                >
                  {currentStepData.title}
                </Typography>
                <Typography
                  variant="h2"
                  sx={{
                    fontSize: { xs: "1.125rem", sm: "1.25rem" },
                    fontWeight: 500,
                    color: "rgba(255, 255, 255, 0.8)",
                    lineHeight: 1.4,
                  }}
                >
                  {currentStepData.subtitle}
                </Typography>
              </Box>

              <Typography
                variant="body1"
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                  lineHeight: 1.6,
                  px: 1,
                }}
              >
                {currentStepData.description}
              </Typography>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Bottom Section */}
      <Box
        sx={{
          position: "relative",
          zIndex: 10,
          py: 3,
        }}
      >
        {/* Progress Indicators */}
        <Box sx={{ mb: 3 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255, 255, 255, 0.3)",
              "& .MuiLinearProgress-bar": {
                borderRadius: 2,
                background: `linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%)`,
              },
            }}
          />
        </Box>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={handleNext}
            variant="contained"
            fullWidth
            size="large"
            className={currentStepData.color}
            sx={{
              height: 48,
              borderRadius: 3,
              fontSize: "1.125rem",
              fontWeight: 600,
              boxShadow: "0 8px 32px rgba(236, 72, 153, 0.3)",
            }}
            endIcon={isLastStep ? <Zap size={20} /> : <ArrowRight size={20} />}
          >
            {isLastStep ? "เริ่มต้นใช้งาน" : "ต่อไป"}
          </Button>
        </motion.div>

        {/* Footer Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.5)",
              mt: 3,
              px: 2,
            }}
          >
            ออกแบบเพื่อนักเรียนและคนรุ่นใหม่ในกรุงเทพฯ
          </Typography>
        </motion.div>
      </Box>
    </Box>
  );
}
