"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { Home, Filter, Heart, User } from "lucide-react";
import { Box, Paper, Typography } from "@mui/material";

type NavItem = {
  href: Route;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/swipe" as Route, label: "หน้าหลัก", icon: Home },
  { href: "/prefs" as Route, label: "ตั้งค่า", icon: Filter },
  { href: "/recs" as Route, label: "รายการ", icon: Heart },
  { href: "/profile" as Route, label: "โปรไฟล์", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const hiddenOnThisRoute =
    pathname === "/" ||
    pathname === "/intro" ||
    pathname === "/login" ||
    pathname === "/register";

  // Measure and publish height -> CSS var (so pages auto-reserve space)
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    function applySpace() {
      const el = rootRef.current;
      if (!el || hiddenOnThisRoute) {
        body.classList.remove("has-bottom-nav");
        html.style.setProperty("--bottom-nav-space", "0px");
        return;
      }
      const h = el.offsetHeight; // includes padding
      html.style.setProperty("--bottom-nav-space", `${h + 8}px`); // +8 for small gap
      body.classList.add("has-bottom-nav");
    }

    // First measurement
    applySpace();

    // Re-measure on resize and when fonts/icons load
    const ro = new ResizeObserver(applySpace);
    if (rootRef.current) ro.observe(rootRef.current);

    window.addEventListener("resize", applySpace);
    const t = setTimeout(applySpace, 0); // fonts/icon SVG paint

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", applySpace);
      ro.disconnect();
      body.classList.remove("has-bottom-nav");
      html.style.setProperty("--bottom-nav-space", "0px");
    };
  }, [pathname, hiddenOnThisRoute]);

  if (hiddenOnThisRoute) return null;

  return (
    <Box
      ref={rootRef}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        zIndex: 2000,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        width: "100%",
        py: 1,
        backdropFilter: "blur(8px)",
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Box
            key={href}
            component="button"
            onClick={() => router.push(href)}
            sx={{
              flex: 1,
              background: "none",
              border: "none",
              borderRadius: "50px",
              outline: "none",
              textAlign: "center",
              fontFamily: "Inter, sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              color: "white",
              transition: "all 0.2s ease",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5,
              py: 0.5,
              "&:hover": {
                color: "#111",
                transform: "scale(1.05)",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 28,
                width: 28,
                borderRadius: "50%",
                transition: "all 0.2s ease",
                backgroundColor: active ? "transparent" : "transparent",
                background: active
                  ? "linear-gradient(135deg, #ec4899, #8b5cf6)"
                  : "transparent",
                color: active ? "white" : "inherit",
              }}
            >
              <Icon
                width={18}
                height={18}
                style={{
                  strokeWidth: 2,
                  stroke: active ? "white" : "currentColor",
                }}
              />
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: "10.5px",
                lineHeight: 1,
                color: active ? "#ec4899" : "inherit",
                fontWeight: active ? 600 : 500,
              }}
            >
              {label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
