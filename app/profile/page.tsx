"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserCircle, Mail } from "lucide-react";
import { Box, Typography, Button, Paper, Avatar } from "@mui/material";
import { useAuth } from "@/contexts/AuthContext";
import ModernLoader from "@/components/ModernLoader";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  const handleNavigate = (path: string) => {
    router.push(path as any);
  };

  useEffect(() => {
    const checkGuestStatus = async () => {
      try {
        const response = await fetch("/api/sessions", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setIsGuest(data.isGuest || false);
        }
      } catch (error) {
        console.error("Failed to check session status:", error);
        setIsGuest(true); // Default to guest mode on error
      } finally {
        setSessionLoading(false);
      }
    };

    checkGuestStatus();
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (loading || sessionLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ModernLoader size={80} label="กำลังโหลดโปรไฟล์..." />
      </Box>
    );
  }

  // Always show login/register for guest users, regardless of auth context
  if (!user || isGuest) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#000000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
          textAlign: "center",
          gap: 3,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}
        >
          <UserCircle size={40} />
        </Box>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#ffffff",
              mb: 1,
            }}
          >
            {isGuest
              ? "สร้างบัญชีเพื่อประสบการณ์ที่ดีขึ้น"
              : "เข้าสู่ระบบเพื่อจัดการบัญชี"}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "#d1d5db",
            }}
          >
            {isGuest
              ? "สร้างบัญชีเพื่อบันทึกสถานที่ที่ชอบและซิงค์ข้อมูลของคุณ"
              : "สร้างบัญชีเพื่อบันทึกสถานที่ที่ชอบ หรือเข้าสู่ระบบเพื่อดูข้อมูลของคุณ"}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            width: "100%",
            maxWidth: "384px",
          }}
        >
          <Button
            onClick={() => handleNavigate("/login")}
            variant="contained"
            fullWidth
            sx={{
              background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #be185d 0%, #7c3aed 100%)",
              },
            }}
          >
            เข้าสู่ระบบ
          </Button>
          <Button
            onClick={() => handleNavigate("/register")}
            variant="outlined"
            fullWidth
            sx={{
              borderColor: "#a855f7",
              color: "#a855f7",
              "&:hover": {
                borderColor: "#9333ea",
                backgroundColor: "rgba(168, 85, 247, 0.1)",
              },
            }}
          >
            สมัครสมาชิก
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        pb: "80px",
      }}
    >
      <Box
        sx={{
          position: "relative",
          background:
            "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #6366f1 100%)",
          color: "white",
          px: 3,
          pt: 8,
          pb: 12,
        }}
      >
        <Box
          sx={{
            maxWidth: "896px",
            mx: "auto",
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {user.profileImage ? (
              <Avatar
                src={user.profileImage}
                alt={user.name || user.email}
                sx={{
                  width: "100%",
                  height: "100%",
                }}
              />
            ) : (
              <UserCircle size={48} />
            )}
          </Box>
          <Box>
            <Typography
              variant="body2"
              sx={{
                fontSize: "0.875rem",
                color: "rgba(255, 255, 255, 0.8)",
              }}
            >
              บัญชีของฉัน
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontSize: "1.5rem",
                fontWeight: 700,
                lineHeight: 1.25,
              }}
            >
              {user.name || "ผู้ใช้ NextSpot"}
            </Typography>
            <Box
              sx={{
                mt: 1,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                fontSize: "0.875rem",
                color: "rgba(255, 255, 255, 0.8)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Mail size={16} />
                <Typography variant="body2" sx={{ fontSize: "0.875rem" }}>
                  {user.email}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          maxWidth: "896px",
          mx: "auto",
          px: 3,
          mt: -8,
        }}
      >
        <Paper
          sx={{
            backgroundColor: "#111827",
            borderRadius: 6,
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            p: 3,
            mt: 3,
          }}
        >
          <Button
            onClick={handleLogout}
            variant="contained"
            fullWidth
            disabled={isLoggingOut}
            startIcon={<LogOut size={20} />}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              backgroundColor: "#dc2626",
              color: "white",
              "&:hover": {
                backgroundColor: "#b91c1c",
              },
              "&:disabled": {
                opacity: 0.5,
              },
            }}
          >
            {isLoggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
