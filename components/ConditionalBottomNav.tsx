"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";

export default function ConditionalBottomNav() {
  const pathname = usePathname();

  // Hide bottom nav on auth pages, home page, and intro page
  const hideBottomNav = pathname === "/" || pathname === "/intro" || pathname === "/login" || pathname === "/register";

  if (hideBottomNav) {
    return null;
  }

  return <BottomNav />;
}