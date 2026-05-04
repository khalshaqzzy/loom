import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicMapClient } from "@/components/PublicMapClient";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    publicHeatmap: vi.fn(),
    publicMarkers: vi.fn(),
    publicLookup: vi.fn()
  }
}));

const mockApi = vi.mocked(api);

describe("PublicMapClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.publicHeatmap.mockResolvedValue({
      points: [
        {
          lat: -6.2,
          lon: 106.8,
          weight: 1,
          message: "fine",
          count: 2,
          latestTimestamp: "2026-05-04T00:00:00.000Z"
        }
      ]
    });
    mockApi.publicMarkers.mockResolvedValue({
      markers: [
        {
          nodeId: "000042",
          nodeIdNumeric: 42,
          lat: -6.2,
          lon: 106.8,
          status: "active",
          lastSeenAt: "2026-05-04T00:00:00.000Z",
          lastMessageAt: "2026-05-04T00:00:00.000Z",
          lastRangeToGateway: 1
        }
      ]
    });
  });

  it("loads public heatmap and marker data", async () => {
    render(<PublicMapClient />);

    await waitFor(() => expect(mockApi.publicHeatmap).toHaveBeenCalledWith(""));
    expect(await screen.findByText("Nodes 1")).toBeInTheDocument();
    expect(screen.getByText("Reports 2")).toBeInTheDocument();
  });

  it("reloads heatmap data when the message filter changes", async () => {
    render(<PublicMapClient />);
    await waitFor(() => expect(mockApi.publicHeatmap).toHaveBeenCalledWith(""));

    await userEvent.selectOptions(screen.getByLabelText(/filter by category/i), "medical_help");

    await waitFor(() => expect(mockApi.publicHeatmap).toHaveBeenCalledWith("medical_help"));
  });

  it("keeps lookup available when map data fails", async () => {
    mockApi.publicHeatmap.mockRejectedValueOnce(new Error("down"));

    render(<PublicMapClient />);

    expect(await screen.findByText("Map data is unavailable. History lookup remains available.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search history/i })).toBeInTheDocument();
  });
});
