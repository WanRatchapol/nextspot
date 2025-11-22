"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Alert,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Eye, EyeOff, Mail, Lock, User, Compass } from "lucide-react";
import Link from "next/link";
import ModernLoader from "@/components/ModernLoader";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { user, register, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  // Redirect if already authenticated or hasn't seen intro
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem("nextspot-intro-seen");

    // If user hasn't seen intro, redirect to intro page
    if (!hasSeenIntro) {
      router.push("/intro");
      return;
    }

    if (!loading && user) {
      router.push("/swipe");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await register(
        formData.email,
        formData.password,
        formData.name || undefined
      );
      // Mark as visited since user successfully authenticated
      localStorage.setItem("nextspot-visited", "true");
      router.push("/prefs");
    } catch (error) {
      setError(error instanceof Error ? error.message : "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

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

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "auto",
        background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
        px: 3,
      }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 3,
          }}
        >
          <Box sx={{ width: 40 }} />
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
          <Box sx={{ width: 40 }} /> {/* Spacer */}
        </Box>
      </motion.div>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ width: "100%", maxWidth: 400 }}
        >
          {/* Card */}
          <Paper
            sx={{
              backgroundColor: "white",
              borderRadius: 6,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
              p: 4,
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: "1.875rem",
                  fontWeight: 700,
                  color: "#1f2937",
                  mb: 1,
                }}
              >
                สมัครสมาชิก
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "#6b7280",
                }}
              >
                สร้างบัญชีใหม่เพื่อบันทึกสถานที่ที่ชอบ
              </Typography>
            </Box>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    borderRadius: 3,
                    "& .MuiAlert-message": {
                      fontSize: "0.875rem",
                    },
                  }}
                >
                  {error}
                </Alert>
              </motion.div>
            )}

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit}>
              {/* Name Field */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: "#374151",
                    mb: 1,
                  }}
                >
                  ชื่อ (ไม่บังคับ)
                </Typography>
                <TextField
                  type="text"
                  fullWidth
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="ชื่อของคุณ"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <User size={20} color="#9ca3af" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 50,
                      backgroundColor: "rgba(0, 0, 0, 0.02)",
                      "& fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&:hover fieldset": {
                        borderColor: "#ec4899",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#ec4899",
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              </Box>

              {/* Email Field */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: "#374151",
                    mb: 1,
                  }}
                >
                  อีเมล
                </Typography>
                <TextField
                  type="email"
                  required
                  fullWidth
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="your@email.com"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Mail size={20} color="#9ca3af" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 50,
                      backgroundColor: "rgba(0, 0, 0, 0.02)",
                      "& fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&:hover fieldset": {
                        borderColor: "#ec4899",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#ec4899",
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              </Box>

              {/* Password Field */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: "#374151",
                    mb: 1,
                  }}
                >
                  รหัสผ่าน
                </Typography>
                <TextField
                  type={showPassword ? "text" : "password"}
                  required
                  fullWidth
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
                  placeholder="อย่างน้อย 8 ตัวอักษร"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock size={20} color="#9ca3af" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: "#9ca3af" }}
                          >
                            {showPassword ? (
                              <EyeOff size={20} />
                            ) : (
                              <Eye size={20} />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 50,
                      backgroundColor: "rgba(0, 0, 0, 0.02)",
                      "& fieldset": {
                        borderColor: "#d1d5db",
                      },
                      "&:hover fieldset": {
                        borderColor: "#ec4899",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#ec4899",
                        borderWidth: 2,
                      },
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: "#6b7280",
                    mt: 1,
                    display: "block",
                  }}
                >
                  รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร
                </Typography>
              </Box>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="contained"
                fullWidth
                size="large"
                sx={{
                  height: 48,
                  borderRadius: 50,
                  background:
                    "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  textTransform: "none",
                  boxShadow: "0 4px 20px rgba(236, 72, 153, 0.3)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #be185d 0%, #7c3aed 100%)",
                    boxShadow: "0 6px 25px rgba(236, 72, 153, 0.4)",
                  },
                  "&:disabled": {
                    opacity: 0.5,
                  },
                }}
              >
                {isSubmitting ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
              </Button>
            </Box>

            {/* Bottom Links */}
            <Box sx={{ mt: 4, textAlign: "center" }}>
              <Typography
                variant="body2"
                sx={{
                  color: "#6b7280",
                  mb: 2,
                }}
              >
                มีบัญชีแล้ว?{" "}
                <Link
                  href="/login"
                  style={{
                    color: "#ec4899",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  เข้าสู่ระบบ
                </Link>
              </Typography>

              <Button
                onClick={() => {
                  router.push("/");
                }}
                variant="text"
                sx={{
                  color: "#9ca3af",
                  fontSize: "0.875rem",
                  textTransform: "none",
                  "&:hover": {
                    color: "#6b7280",
                    backgroundColor: "transparent",
                  },
                }}
              >
                ใช้งานแบบไม่ลงทะเบียน
              </Button>
            </Box>
          </Paper>
        </motion.div>
      </Box>

      {/* Bottom Decoration */}
      <Box
        sx={{
          position: "relative",
          zIndex: 10,
          py: 3,
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.7)",
            }}
          >
            ออกแบบเพื่อนักเรียนและคนรุ่นใหม่ในกรุงเทพฯ
          </Typography>
        </motion.div>
      </Box>
    </Box>
  );
}
