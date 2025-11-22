"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, ExternalLink, Route, Clock } from "lucide-react";
import { Box, Typography, Button, Paper } from "@mui/material";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

export interface DestinationItem {
  id: string;
  nameTh: string;
  nameEn: string;
  descTh: string;
  imageUrl: string;
  tags: string[];
  latitude?: number;
  longitude?: number;
  district?: string;
}

interface DestinationMapProps {
  destinations: DestinationItem[];
  onDestinationClick: (destination: DestinationItem) => void;
  onExportToGoogleMaps: () => void;
  onOptimizeRoute: () => void;
  showRoute?: boolean;
  optimizedRoute?: DestinationItem[];
}

export default function DestinationMap({
  destinations,
  onDestinationClick,
  onExportToGoogleMaps,
  onOptimizeRoute,
  showRoute = false,
  optimizedRoute = [],
}: DestinationMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Configure default Leaflet marker icons for Next.js
  useEffect(() => {
    const iconRetinaUrl =
      typeof markerIcon2x === "string" ? markerIcon2x : markerIcon2x.src;
    const iconUrl =
      typeof markerIcon === "string" ? markerIcon : markerIcon.src;
    const shadowUrl =
      typeof markerShadow === "string" ? markerShadow : markerShadow.src;

    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
    });
  }, []);

  // Filter destinations with valid coordinates
  const validDestinations = destinations.filter(
    (dest) => dest.latitude && dest.longitude
  );

  const mapPositions = useMemo<LatLngExpression[]>(
    () =>
      validDestinations.map(
        (dest) => [dest.latitude!, dest.longitude!] as LatLngExpression
      ),
    [validDestinations]
  );

  const routePositions = useMemo<LatLngExpression[]>(
    () =>
      optimizedRoute
        .filter((dest) => dest.latitude && dest.longitude)
        .map(
          (dest) => [dest.latitude!, dest.longitude!] as LatLngExpression
        ),
    [optimizedRoute]
  );

  const defaultCenter: LatLngExpression = [13.7563, 100.5018]; // Bangkok

  useEffect(() => {
    if (!mapInstance) return;

    if (mapPositions.length > 0) {
      const bounds = L.latLngBounds(mapPositions);
      mapInstance.fitBounds(bounds, { padding: [24, 24] });
    } else {
      mapInstance.setView(defaultCenter, 11);
    }
  }, [mapInstance, mapPositions, defaultCenter]);

  const calculateTotalDistance = () => {
    if (optimizedRoute.length < 2) return 0;

    let total = 0;
    for (let i = 0; i < optimizedRoute.length - 1; i++) {
      const dest1 = optimizedRoute[i];
      const dest2 = optimizedRoute[i + 1];

      if (!dest1.latitude || !dest1.longitude || !dest2.latitude || !dest2.longitude) continue;

      // Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (dest2.latitude - dest1.latitude) * Math.PI / 180;
      const dLng = (dest2.longitude - dest1.longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(dest1.latitude * Math.PI / 180) * Math.cos(dest2.latitude * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      total += R * c;
    }
    return total;
  };

  const totalDistance = calculateTotalDistance();
  const estimatedTime = validDestinations.length * 2; // 2 hours per destination

  if (!isClient) {
    return (
      <Paper
        sx={{
          height: 384,
          backgroundColor: "#111827",
          borderRadius: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #374151",
        }}
      >
        <Box sx={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 2 }}>
          <MapPin size={64} style={{ color: "#a855f7", margin: "0 auto" }} />
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#ffffff",
                mb: 1,
              }}
            >
              กำลังโหลดแผนที่...
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#d1d5db",
              }}
            >
              กรุณารอสักครู่
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }

  if (validDestinations.length === 0) {
    return (
      <Paper
        sx={{
          backgroundColor: "#111827",
          borderRadius: 3,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
          border: "1px solid #374151",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: 384,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            textAlign: "center",
            px: 3,
          }}
        >
          <MapPin size={56} style={{ color: "#a855f7" }} />
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              ยังไม่มีตำแหน่งที่จะแสดงบนแผนที่
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "#d1d5db",
                mt: 1,
              }}
            >
              เพิ่มพิกัดให้สถานที่หรือเลือกดูรายการในรูปแบบอื่น
            </Typography>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        backgroundColor: "#111827",
        borderRadius: 3,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
        border: "1px solid #374151",
        overflow: "hidden",
      }}
    >
      <Box sx={{ height: 384, position: "relative" }}>
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
          ref={setMapInstance}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mapPositions.map((position, index) => {
            const destination = validDestinations[index];
            return (
              <Marker
                key={destination.id}
                position={position}
                eventHandlers={{
                  click: () => onDestinationClick(destination),
                }}
              >
                <Popup>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {destination.nameTh}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                      }}
                    >
                      {destination.nameEn}
                    </Typography>
                    {destination.district && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.75rem",
                          color: "#9ca3af",
                        }}
                      >
                        เขต {destination.district}
                      </Typography>
                    )}
                  </Box>
                </Popup>
              </Marker>
            );
          })}

          {showRoute && routePositions.length > 1 && (
            <Polyline
              positions={routePositions}
              pathOptions={{ color: "#ec4899", weight: 4, dashArray: "8 12" }}
            />
          )}
        </MapContainer>

        <Box
          sx={{
            position: "absolute",
            left: 16,
            bottom: 16,
            display: "flex",
            gap: 1,
          }}
        >
          <Button
            onClick={onExportToGoogleMaps}
            variant="contained"
            startIcon={<ExternalLink size={16} />}
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              color: "#3b82f6",
              borderRadius: 6,
              px: 2,
              py: 1,
              fontSize: "0.875rem",
              fontWeight: 500,
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 1)",
              },
            }}
          >
            เปิดใน Google Maps
          </Button>
        </Box>
      </Box>

      {/* Trip Planning Controls */}
      <Box
        sx={{
          p: 3,
          borderTop: "1px solid #374151",
          backgroundColor: "#1f2937",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: "0.875rem",
              color: "#d1d5db",
            }}
          >
            แสดง {validDestinations.length} สถานที่บนแผนที่
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              onClick={onOptimizeRoute}
              variant="contained"
              startIcon={<Route size={12} />}
              sx={{
                px: 2,
                py: 0.5,
                backgroundColor: "#3730a3",
                color: "#c7d2fe",
                borderRadius: 6,
                fontSize: "0.875rem",
                fontWeight: 500,
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "#4338ca",
                },
              }}
            >
              เส้นทางที่ดีที่สุด
            </Button>
            <Button
              onClick={onExportToGoogleMaps}
              variant="contained"
              startIcon={<ExternalLink size={12} />}
              sx={{
                px: 2,
                py: 0.5,
                backgroundColor: "#065f46",
                color: "#a7f3d0",
                borderRadius: 6,
                fontSize: "0.875rem",
                fontWeight: 500,
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "#047857",
                },
              }}
            >
              Google Maps
            </Button>
          </Box>
        </Box>

        {/* Route Statistics */}
        {showRoute && optimizedRoute.length > 1 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              pt: 2,
              borderTop: "1px solid #374151",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Route size={12} style={{ color: "#d1d5db" }} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.875rem",
                  color: "#d1d5db",
                }}
              >
                ระยะทาง: {totalDistance.toFixed(1)} กม.
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Clock size={12} style={{ color: "#d1d5db" }} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.875rem",
                  color: "#d1d5db",
                }}
              >
                เวลาโดยประมาณ: {estimatedTime} ชั่วโมง
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
