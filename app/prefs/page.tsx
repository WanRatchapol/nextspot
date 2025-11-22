"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Box, Typography, Button, Grid, Stack } from "@mui/material";
import { usePreferencesStore } from "@/lib/stores/preferences";
import {
  PreferencesSchema,
  MOOD_OPTIONS,
  BUDGET_OPTIONS,
  TIME_OPTIONS,
  MoodOption,
} from "@/types/preferences";
import { firePrefsView, firePrefsSubmit } from "@/utils/analytics";
import type { LucideIcon } from "lucide-react";
import {
  Wallet,
  Sparkles,
  Clock3,
  Wind,
  Mountain,
  Utensils,
  Landmark,
  Users,
  Heart as HeartIcon,
  Check,
} from "lucide-react";

const moodIconMap: Record<MoodOption["id"], LucideIcon> = {
  chill: Wind,
  adventure: Mountain,
  foodie: Utensils,
  cultural: Landmark,
  social: Users,
  romantic: HeartIcon,
};

export default function PreferencesPage() {
  const router = useRouter();
  const {
    budgetBand,
    moodTags,
    timeWindow,
    isSubmitting,
    validationErrors,
    setBudgetBand,
    toggleMoodTag,
    setTimeWindow,
    setSubmitting,
    setValidationErrors,
    clearValidationErrors,
    getPreferences,
    isValid,
  } = usePreferencesStore();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const cookies = document.cookie.split(";");
    const sidCookie = cookies.find((cookie) =>
      cookie.trim().startsWith("sid=")
    );
    if (sidCookie) {
      const sessionId = sidCookie.split("=")[1];

      // Check if session ID is in old format (starts with 'sess_')
      if (sessionId.startsWith("sess_")) {
        console.log(
          "[Prefs] Old session format detected, clearing and redirecting to create new session"
        );
        // Clear old cookie
        document.cookie =
          "sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        // Redirect to landing page to create new session
        router.push("/");
        return;
      }

      setSessionId(sessionId);
      console.log("[Prefs] Session ID found:", sessionId);
    } else {
      console.log("[Prefs] No session ID found - redirecting to create one");
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    firePrefsView(sessionId || undefined);
  }, [sessionId]);

  // Fetch existing preferences when sessionId is available
  useEffect(() => {
    if (!sessionId) return;

    const fetchPreferences = async () => {
      try {
        console.log("[Prefs] Fetching existing preferences for session:", sessionId);
        const response = await fetch(`/api/sessions/${sessionId}/preferences`);

        if (response.ok) {
          const data = await response.json();
          console.log("[Prefs] Fetched preferences:", data);

          if (data.preferences) {
            // Load preferences into the store
            if (data.preferences.budgetBand) {
              setBudgetBand(data.preferences.budgetBand);
            }
            if (data.preferences.timeWindow) {
              setTimeWindow(data.preferences.timeWindow);
            }
            if (data.preferences.moodTags && data.preferences.moodTags.length > 0) {
              // Set mood tags by toggling each one (since toggleMoodTag adds if not present)
              data.preferences.moodTags.forEach((tag: string) => {
                // Only toggle if it's not already selected
                if (!moodTags.includes(tag as any)) {
                  toggleMoodTag(tag as any);
                }
              });
            }
          }
        } else {
          console.log("[Prefs] No existing preferences found or error:", response.status);
        }
      } catch (error) {
        console.error("[Prefs] Error fetching preferences:", error);
      }
    };

    fetchPreferences();
  }, [sessionId, setBudgetBand, setTimeWindow, toggleMoodTag, moodTags]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleSubmit = async () => {
    clearValidationErrors();

    const preferences = getPreferences();
    const result = PreferencesSchema.safeParse(preferences);

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        errors[path] = issue.message;
      });
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      if (sessionId) {
        const response = await fetch(`/api/sessions/${sessionId}/preferences`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            budgetBand: result.data.budgetBand,
            moodTags: result.data.moodTags,
            timeWindow: result.data.timeWindow,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("API Error:", errorData);

          if (response.status === 400 && errorData.error) {
            setValidationErrors({
              general: errorData.error.message,
            });
            return;
          }

          throw new Error(`API Error: ${response.status}`);
        }

        const apiResponse = await response.json();
        console.log("Preferences saved successfully:", apiResponse);
      }

      firePrefsSubmit(
        result.data.budgetBand,
        result.data.moodTags,
        result.data.timeWindow,
        sessionId || undefined
      );

      console.log(
        "[Prefs] Preferences saved successfully, navigating to /swipe"
      );
      router.push("/swipe" as any);
    } catch (error) {
      console.error("Error submitting preferences:", error);

      setValidationErrors({
        general: "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองอีกครั้ง",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitDisabled = hasMounted ? !isValid() || isSubmitting : true;
  const showIncompleteHint = hasMounted && !isValid();

  // Progress calculation
  const progress =
    ((budgetBand ? 1 : 0) +
      (moodTags.length > 0 ? 1 : 0) +
      (timeWindow ? 1 : 0)) /
    3;

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        minHeight: "100vh",
        maxHeight: "100vh",
        display: "flex",
        flexDirection: "column",
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
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 20% 20%, rgba(168, 85, 247, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 40% 60%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
          style={{
            position: "absolute",
            inset: 0,
          }}
        />
      </Box>

      {/* Header */}
      <Box
        component={motion.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          pt: 2,
          pb: 3,
          px: 3,
          backgroundColor: "rgba(0, 0, 0, 0.1)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Stack spacing={1}>
            <Typography
              component={motion.h1}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              variant="h4"
              sx={{
                fontWeight: "bold",
                color: "white",
                fontSize: { xs: "1.5rem", sm: "2rem" },
              }}
            >
              ตั้งค่าความต้องการ
            </Typography>
            <Typography
              component={motion.p}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              variant="body1"
              sx={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
              เลือกงบประมาณ อารมณ์ และเวลาที่คุณมี
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              bgcolor: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(12px)",
              borderRadius: "20px",
              px: 3,
              py: 1.5,
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <Box sx={{ display: "flex", gap: 1 }}>
              {[1, 2, 3].map((step) => (
                <Box
                  key={step}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    transition: "all 0.2s",
                    bgcolor:
                      step <= Math.ceil(progress * 3)
                        ? "white"
                        : "rgba(255, 255, 255, 0.3)",
                  }}
                />
              ))}
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 500, color: "rgba(255, 255, 255, 0.9)" }}
            >
              {Math.round(progress * 100)}%
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          overflowY: "auto",
          px: 3,
          pb: "calc(var(--bottom-nav-space, 80px) + 16px)",
          pt: 2,
        }}
      >
        <Stack spacing={4}>
          {/* Budget Section */}
          <Box
            component={motion.section}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  height: 36,
                  width: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, #10b981 0%, #0d9488 100%)",
                }}
              >
                <Wallet size={20} color="white" />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: "white",
                    fontSize: { xs: "1.125rem", sm: "1.25rem" },
                  }}
                >
                  งบประมาณต่อคน
                </Typography>
                <Typography
                  sx={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: "0.875rem",
                  }}
                >
                  เลือกช่วงราคาที่คุณสบายใจ
                </Typography>
              </Box>
            </Box>

            <Stack spacing={2}>
              {BUDGET_OPTIONS.map((option, index) => {
                const isSelected = budgetBand === option.id;
                return (
                  <Button
                    key={option.id}
                    component={motion.button}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setBudgetBand(option.id)}
                    data-testid={`budget-${option.id}`}
                    sx={{
                      width: "100%",
                      borderRadius: "16px",
                      border: 2,
                      borderColor: isSelected ? "#10b981" : "#e5e7eb",
                      py: 2,
                      px: 3,
                      textAlign: "left",
                      transition: "all 0.3s",
                      bgcolor: "white",
                      boxShadow: isSelected
                        ? "0 10px 15px -3px rgba(16, 185, 129, 0.2)"
                        : "none",
                      "&:hover": {
                        borderColor: isSelected ? "#10b981" : "#d1d5db",
                        boxShadow: isSelected
                          ? "0 20px 25px -5px rgba(16, 185, 129, 0.2)"
                          : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        bgcolor: "white",
                      },
                      textTransform: "none",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: isSelected ? "#047857" : "#111827",
                          textAlign: "left",
                        }}
                      >
                        {option.labelThai}
                      </Typography>
                      <Typography
                        sx={{
                          color: isSelected ? "#059669" : "#6b7280",
                          textAlign: "left",
                        }}
                      >
                        {option.range}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: isSelected ? "#059669" : "#6b7280",
                        }}
                      >
                        {option.description}
                      </Typography>
                      {isSelected && (
                        <Box
                          sx={{
                            display: "flex",
                            height: 32,
                            width: 32,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            bgcolor: "#10b981",
                            color: "white",
                          }}
                        >
                          <Check size={16} />
                        </Box>
                      )}
                    </Box>
                  </Button>
                );
              })}
            </Stack>
          </Box>

          {/* Mood Section */}
          <Box
            component={motion.section}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  height: 36,
                  width: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
                }}
              >
                <Sparkles size={20} color="white" />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: "white",
                    fontSize: { xs: "1.125rem", sm: "1.25rem" },
                  }}
                >
                  อารมณ์ที่อยากได้
                </Typography>
                <Typography
                  sx={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: "0.875rem",
                  }}
                >
                  เลือกได้หลายอารมณ์เพื่อให้แม่นขึ้น
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={2}>
              {MOOD_OPTIONS.map((mood, index) => {
                const MoodIcon = moodIconMap[mood.id];
                const isSelected = moodTags.includes(mood.id);

                return (
                  <Grid size={6} key={mood.id}>
                    <Button
                      component={motion.button}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.25 + index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleMoodTag(mood.id)}
                      data-testid={`mood-${mood.id}`}
                      sx={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                        borderRadius: "16px",
                        border: 2,
                        borderColor: isSelected ? "#8b5cf6" : "#e5e7eb",
                        py: 2,
                        px: 3,
                        transition: "all 0.3s",
                        bgcolor: "white",
                        boxShadow: isSelected
                          ? "0 10px 15px -3px rgba(139, 92, 246, 0.2)"
                          : "none",
                        "&:hover": {
                          borderColor: isSelected ? "#8b5cf6" : "#d1d5db",
                          boxShadow: isSelected
                            ? "0 20px 25px -5px rgba(139, 92, 246, 0.2)"
                            : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          bgcolor: "white",
                        },
                        textTransform: "none",
                        width: "100%",
                        height: "auto",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          height: 40,
                          width: 40,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "12px",
                          transition: "all 0.2s",
                          bgcolor: isSelected ? "#f3e8ff" : "#f3f4f6",
                        }}
                      >
                        <MoodIcon
                          size={20}
                          color={isSelected ? "#8b5cf6" : "#6b7280"}
                        />
                      </Box>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 500,
                            color: isSelected ? "#6d28d9" : "#111827",
                          }}
                        >
                          {mood.labelThai}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: isSelected ? "#8b5cf6" : "#6b7280",
                          }}
                        >
                          {mood.description}
                        </Typography>
                      </Box>

                      <AnimatePresence>
                        {isSelected && (
                          <Box
                            component={motion.div}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            sx={{
                              position: "absolute",
                              top: -8,
                              right: -8,
                              display: "flex",
                              height: 24,
                              width: 24,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "50%",
                              bgcolor: "#8b5cf6",
                              border: "2px solid white",
                              color: "white",
                            }}
                          >
                            <Check size={12} />
                          </Box>
                        )}
                      </AnimatePresence>
                    </Button>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          {/* Time Section */}
          <Box
            component={motion.section}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  height: 36,
                  width: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
                }}
              >
                <Clock3 size={20} color="white" />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: "white",
                    fontSize: { xs: "1.125rem", sm: "1.25rem" },
                  }}
                >
                  เวลาที่คุณมี
                </Typography>
                <Typography
                  sx={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: "0.875rem",
                  }}
                >
                  เลือกว่าอยากใช้เวลาชิลแค่ไหน
                </Typography>
              </Box>
            </Box>

            <Stack spacing={2}>
              {TIME_OPTIONS.map((option, index) => (
                <Button
                  key={option.id}
                  component={motion.button}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 + index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTimeWindow(option.id)}
                  data-testid={`time-${option.id}`}
                  sx={{
                    width: "100%",
                    borderRadius: "16px",
                    border: 2,
                    borderColor:
                      timeWindow === option.id ? "#3b82f6" : "#e5e7eb",
                    py: 2,
                    px: 3,
                    textAlign: "left",
                    transition: "all 0.3s",
                    bgcolor: "white",
                    boxShadow:
                      timeWindow === option.id
                        ? "0 10px 15px -3px rgba(59, 130, 246, 0.2)"
                        : "none",
                    "&:hover": {
                      borderColor:
                        timeWindow === option.id ? "#3b82f6" : "#d1d5db",
                      boxShadow:
                        timeWindow === option.id
                          ? "0 20px 25px -5px rgba(59, 130, 246, 0.2)"
                          : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      bgcolor: "white",
                    },
                    textTransform: "none",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: timeWindow === option.id ? "#1d4ed8" : "#111827",
                        textAlign: "left",
                      }}
                    >
                      {option.labelThai}
                    </Typography>
                    <Typography
                      sx={{
                        color: timeWindow === option.id ? "#2563eb" : "#6b7280",
                        textAlign: "left",
                      }}
                    >
                      {option.description}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: timeWindow === option.id ? "#2563eb" : "#6b7280",
                      }}
                    >
                      {option.duration}
                    </Typography>
                    {timeWindow === option.id && (
                      <Box
                        sx={{
                          display: "flex",
                          height: 32,
                          width: 32,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "50%",
                          bgcolor: "#3b82f6",
                          color: "white",
                        }}
                      >
                        <Check size={16} />
                      </Box>
                    )}
                  </Box>
                </Button>
              ))}
            </Stack>
          </Box>

          {/* Submit Button Section */}
          <Box
            component={motion.section}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            sx={{ pt: 4, pb: 4 }}
          >
            <Stack spacing={3}>
              <Button
                component={motion.button}
                whileHover={{ scale: submitDisabled ? 1 : 1.02 }}
                whileTap={{ scale: submitDisabled ? 1 : 0.98 }}
                onClick={handleSubmit}
                disabled={submitDisabled}
                data-testid="prefs-submit"
                sx={{
                  width: "100%",
                  borderRadius: "16px",
                  py: 2,
                  px: 3,
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  color: "white",
                  transition: "all 0.3s",
                  minHeight: "56px",
                  background: submitDisabled
                    ? "rgba(255, 255, 255, 0.2)"
                    : "linear-gradient(90deg, #ec4899 0%, #8b5cf6 50%, #6366f1 100%)",
                  cursor: submitDisabled ? "not-allowed" : "pointer",
                  opacity: submitDisabled ? 0.5 : 1,
                  boxShadow: submitDisabled
                    ? "none"
                    : "0 10px 15px -3px rgba(139, 92, 246, 0.3)",
                  "&:hover": {
                    background: submitDisabled
                      ? "rgba(255, 255, 255, 0.2)"
                      : "linear-gradient(90deg, #ec4899 0%, #8b5cf6 50%, #6366f1 100%)",
                    boxShadow: submitDisabled
                      ? "none"
                      : "0 20px 25px -5px rgba(139, 92, 246, 0.4)",
                  },
                  textTransform: "none",
                }}
              >
                {isSubmitting ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 3,
                    }}
                  >
                    <Box
                      component={motion.div}
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      sx={{
                        height: 20,
                        width: 20,
                        borderRadius: "50%",
                        border: "2px solid white",
                        borderTopColor: "transparent",
                      }}
                    />
                    กำลังประมวลผล...
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                    }}
                  >
                    <Sparkles size={20} />
                    เริ่มเลือกสถานที่
                  </Box>
                )}
              </Button>

              <AnimatePresence>
                {showIncompleteHint && (
                  <Typography
                    component={motion.p}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    sx={{
                      textAlign: "center",
                      color: "rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    กรุณาเลือกครบทุกหมวดหมู่เพื่อไปต่อ
                  </Typography>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {validationErrors.general && (
                  <Typography
                    component={motion.p}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    sx={{ textAlign: "center", color: "#f87171" }}
                    data-testid="err-general"
                  >
                    {validationErrors.general}
                  </Typography>
                )}
              </AnimatePresence>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
