"use client";

import { CircleF, GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import type { HeatmapPoint } from "@loom/contracts";
import type { ReactNode } from "react";
import { useMemo } from "react";

type MarkerLike = {
  nodeId: string;
  nodeIdNumeric: number;
  lat: number | null;
  lon: number | null;
  status: string;
  lastSeenAt?: string | null | undefined;
  lastMessageAt?: string | null | undefined;
  lastRangeToGateway?: number | null | undefined;
  ownerFullName?: string | undefined;
};

const center = { lat: -6.2, lng: 106.816666 };

export function MapVisual({
  points,
  markers,
  markerOnly,
  mapType = "roadmap",
  onMarkerSelect,
  children
}: {
  points?: HeatmapPoint[] | undefined;
  markers?: MarkerLike[] | undefined;
  markerOnly?: boolean;
  mapType?: string;
  onMarkerSelect?: (marker: MarkerLike) => void;
  children?: ReactNode;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: key ?? ""
  });

  const heatmapData = useMemo(() => {
    if (!isLoaded || markerOnly || !points?.length) return [];
    return points.map((point) => ({
      center: { lat: point.lat, lng: point.lon },
      radius: Math.min(1_900, 600 + point.weight * 450 + point.count * 120),
      opacity: Math.min(0.42, 0.16 + point.weight * 0.08 + point.count * 0.04)
    }));
  }, [isLoaded, markerOnly, points]);

  if (!key || loadError || !isLoaded) {
    return <FallbackMap markers={markers} points={points}>{children}</FallbackMap>;
  }

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden rounded-xl border border-border bg-mist shadow-panel">
      <GoogleMap
        mapContainerClassName="h-full min-h-[520px] w-full"
        center={center}
        zoom={11}
        mapTypeId={mapType}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        }}
      >
        {!markerOnly && heatmapData.length
          ? heatmapData.map((point, index) => (
              <CircleF
                key={`${point.center.lat}-${point.center.lng}-${index}`}
                center={point.center}
                radius={point.radius}
                options={{
                  strokeColor: "#0f5fd7",
                  strokeOpacity: 0.18,
                  strokeWeight: 1,
                  fillColor: "#12a7a2",
                  fillOpacity: point.opacity
                }}
              />
            ))
          : null}
        {markers?.map((marker) =>
          marker.lat !== null && marker.lon !== null ? (
            <MarkerF
              key={marker.nodeId}
              position={{ lat: marker.lat, lng: marker.lon }}
              title={marker.nodeId}
              onClick={() => onMarkerSelect?.(marker)}
            />
          ) : null
        )}
      </GoogleMap>
      {children}
    </div>
  );
}

export function FallbackMap({
  markers,
  points,
  children
}: {
  markers?: MarkerLike[] | undefined;
  points?: HeatmapPoint[] | undefined;
  children?: ReactNode;
}) {
  const markerList = markers?.filter((marker) => marker.lat !== null && marker.lon !== null).slice(0, 14) ?? [];
  const heatPoints = points?.slice(0, 5) ?? [];
  return (
    <div className="map-grid relative h-full min-h-[520px] overflow-hidden rounded-xl border border-border bg-[#eef6f8] shadow-panel">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_44%,rgba(18,167,162,0.28),transparent_18rem),radial-gradient(circle_at_62%_58%,rgba(15,95,215,0.22),transparent_20rem)]" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 560" aria-hidden="true">
        <path
          d="M95 350 C210 235 245 442 382 292 S604 210 792 330"
          fill="none"
          stroke="#0f5fd7"
          strokeWidth="3"
          className="mesh-line"
          opacity="0.72"
        />
        <path
          d="M155 210 C268 160 338 220 456 182 S650 126 782 188"
          fill="none"
          stroke="#12a7a2"
          strokeWidth="3"
          className="mesh-line"
          opacity="0.72"
        />
        {markerList.map((marker, index) => {
          const x = 100 + ((index * 137) % 700);
          const y = 130 + ((index * 83) % 310);
          const mesh = marker.status === "active";
          return (
            <g key={marker.nodeId}>
              <circle cx={x} cy={y} r="22" fill={mesh ? "rgba(18,167,162,0.18)" : "rgba(15,95,215,0.16)"} />
              <circle cx={x} cy={y} r="10" fill={mesh ? "#12a7a2" : "#0f5fd7"} stroke="white" strokeWidth="4" />
            </g>
          );
        })}
        {!markerList.length
          ? Array.from({ length: 12 }).map((_, index) => {
              const x = 110 + ((index * 121) % 690);
              const y = 120 + ((index * 97) % 330);
              return (
                <g key={index}>
                  <circle cx={x} cy={y} r="22" fill={index % 3 === 0 ? "rgba(18,167,162,0.18)" : "rgba(15,95,215,0.16)"} />
                  <circle
                    cx={x}
                    cy={y}
                    r="10"
                    fill={index % 3 === 0 ? "#12a7a2" : "#0f5fd7"}
                    stroke="white"
                    strokeWidth="4"
                  />
                </g>
              );
            })
          : null}
      </svg>
      {heatPoints.map((point, index) => (
        <div
          key={`${point.lat}-${point.lon}-${index}`}
          className="absolute size-32 rounded-full bg-command/20 blur-2xl"
          style={{
            left: `${18 + index * 14}%`,
            top: `${22 + (index % 3) * 16}%`
          }}
        />
      ))}
      {children}
    </div>
  );
}
