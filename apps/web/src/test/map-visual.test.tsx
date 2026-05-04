import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { MapVisual } from "@/components/MapVisual";

vi.mock("@react-google-maps/api", () => ({
  GoogleMap: ({ children, mapTypeId }: { children: React.ReactNode; mapTypeId?: string }) => (
    <div data-testid="google-map" data-map-type={mapTypeId}>
      {children}
    </div>
  ),
  CircleF: () => <div data-testid="heatmap-layer" />,
  MarkerF: ({ title }: { title: string }) => <button type="button">{title}</button>,
  useJsApiLoader: () => ({ isLoaded: true, loadError: null })
}));

describe("MapVisual", () => {
  it("passes the selected map type to Google Maps", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");

    render(<MapVisual mapType="satellite" />);

    expect(screen.getByTestId("google-map")).toHaveAttribute("data-map-type", "satellite");
  });

  it("renders heatmap data unless marker-only mode is selected", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "test-key");

    const { rerender } = render(
      <MapVisual
        points={[
          {
            lat: -6.2,
            lon: 106.8,
            weight: 1,
            message: "fine",
            count: 1,
            latestTimestamp: "2026-05-04T00:00:00.000Z"
          }
        ]}
      />
    );

    expect(screen.getByTestId("heatmap-layer")).toBeInTheDocument();

    rerender(
      <MapVisual
        markerOnly
        points={[
          {
            lat: -6.2,
            lon: 106.8,
            weight: 1,
            message: "fine",
            count: 1,
            latestTimestamp: "2026-05-04T00:00:00.000Z"
          }
        ]}
      />
    );

    expect(screen.queryByTestId("heatmap-layer")).not.toBeInTheDocument();
  });
});
