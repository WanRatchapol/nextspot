"use client";

import { motion, Transition } from "framer-motion";
import { Box, Typography } from "@mui/material";

type ModernLoaderProps = {
  size?: number;
  label?: string;
};

const bounceTransition: Transition = {
  repeat: Infinity,
  repeatType: "mirror",
  duration: 1.2,
  ease: "easeInOut",
};

export default function ModernLoader({ size = 56, label }: ModernLoaderProps) {
  const bubbleSize = size / 2.8;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
        }}
      >
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #6366f1 100%)",
            filter: "blur(6px)",
            opacity: 0.6,
          }}
          animate={{ scale: [0.9, 1.05, 0.9], rotate: [0, 12, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3.4, ease: "easeInOut" } as Transition}
        />

        <motion.div
          style={{
            position: "absolute",
            inset: "18%",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
          }}
          animate={{ scale: [0.95, 1.08, 0.95] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" } as Transition}
        />

        <Box
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
          }}
        >
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              style={{
                display: "block",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                boxShadow: "0 4px 12px rgba(236, 72, 153, 0.3)",
                width: bubbleSize,
                height: bubbleSize,
              }}
              animate={{ y: ["0%", "-45%", "0%"] }}
              transition={{
                ...bounceTransition,
                delay: index * 0.16,
              }}
            />
          ))}
        </Box>
      </Box>

      {label && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" } as Transition}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "white",
            }}
          >
            {label}
          </Typography>
        </motion.div>
      )}
    </Box>
  );
}
