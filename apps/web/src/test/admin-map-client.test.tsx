import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminMapClient } from "@/components/admin/AdminMapClient";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    adminHeatmap: vi.fn(),
    adminMarkers: vi.fn()
  }
}));

const mockApi = vi.mocked(api);

describe("AdminMapClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.adminHeatmap.mockResolvedValue({
      points: [
        {
          lat: -6.2,
          lon: 106.8,
          weight: 1,
          message: "fine",
          count: 1,
          latestTimestamp: "2026-05-04T00:00:00.000Z"
        }
      ]
    });
    mockApi.adminMarkers.mockResolvedValue({
      markers: [
        {
          nodeId: "000042",
          nodeIdNumeric: 42,
          lat: -6.2,
          lon: 106.8,
          status: "active",
          lastSeenAt: "2026-05-04T00:00:00.000Z",
          lastMessageAt: "2026-05-04T00:00:00.000Z",
          lastRangeToGateway: 1,
          ownerFullName: "Ayu Lestari"
        }
      ]
    });
  });

  it("loads admin heatmap and marker data", async () => {
    render(<AdminMapClient />);

    await waitFor(() => expect(mockApi.adminHeatmap).toHaveBeenCalledWith(""));
    expect(await screen.findByText("Selected node")).toBeInTheDocument();
  });

  it("reloads admin heatmap when the message filter changes", async () => {
    render(<AdminMapClient />);
    await waitFor(() => expect(mockApi.adminHeatmap).toHaveBeenCalledWith(""));

    await userEvent.selectOptions(screen.getByLabelText(/message value/i), "medical_help");

    await waitFor(() => expect(mockApi.adminHeatmap).toHaveBeenCalledWith("medical_help"));
  });
});
