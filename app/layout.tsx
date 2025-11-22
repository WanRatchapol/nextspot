import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import ConditionalBottomNav from "@/components/ConditionalBottomNav";
import ClientThemeProvider from "@/components/ClientThemeProvider";

export const metadata: Metadata = {
  title: "NextSpot - ค้นหาสถานที่ที่ใช่สำหรับคุณ",
  description:
    "Find your perfect spot in Bangkok by swiping. Quick travel recommendations for Thai university students.",
  keywords: ["travel", "bangkok", "recommendations", "university", "students"],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <ClientThemeProvider>
          <AuthProvider>
            {children}
            <ConditionalBottomNav />
          </AuthProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
