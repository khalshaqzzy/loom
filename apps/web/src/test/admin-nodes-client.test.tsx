import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminNodesClient } from "@/components/admin/AdminNodesClient";
import { api } from "@/lib/api";

vi.mock("next/link", () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
}));

vi.mock("@/lib/api", () => ({
  api: {
    nodes: vi.fn(),
    registerNode: vi.fn()
  }
}));

const mockApi = vi.mocked(api);

describe("AdminNodesClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.nodes.mockResolvedValue({
      nodes: [
        {
          nodeId: "000042",
          nodeIdNumeric: 42,
          ownerFullName: "Ayu Lestari",
          status: "active",
          lastSeenAt: "2026-05-04T00:00:00.000Z",
          lastMessageAt: "2026-05-04T00:00:00.000Z",
          lastKnownLat: -6.2,
          lastKnownLon: 106.8,
          lastRangeToGateway: 1,
          createdAt: "2026-05-04T00:00:00.000Z",
          updatedAt: "2026-05-04T00:00:00.000Z"
        }
      ]
    });
  });

  it("loads and searches registered nodes", async () => {
    render(<AdminNodesClient />);

    expect(await screen.findByText("Ayu Lestari")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/search node id or owner name/i), "Ayu");

    await waitFor(() => expect(mockApi.nodes).toHaveBeenCalledWith("Ayu"));
  });

  it("registers a node and reloads the table", async () => {
    mockApi.registerNode.mockResolvedValue({
      node: {
        nodeId: "000099",
        nodeIdNumeric: 99,
        ownerFullName: "Bima Santoso",
        status: "inactive",
        lastSeenAt: null,
        lastMessageAt: null,
        lastKnownLat: null,
        lastKnownLon: null,
        lastRangeToGateway: null,
        createdAt: "2026-05-04T00:00:00.000Z",
        updatedAt: "2026-05-04T00:00:00.000Z"
      }
    });

    render(<AdminNodesClient />);
    await screen.findByText("Ayu Lestari");

    await userEvent.click(screen.getAllByRole("button", { name: /register node/i }).at(-1)!);
    await userEvent.type(screen.getByLabelText("Node ID"), "99");
    await userEvent.type(screen.getByLabelText(/owner full name/i), "Bima Santoso");
    await userEvent.type(screen.getByLabelText(/owner birth date/i), "1990-04-12");
    await userEvent.click(screen.getAllByRole("button", { name: /register node/i }).at(-1)!);

    await waitFor(() =>
      expect(mockApi.registerNode).toHaveBeenCalledWith({
        nodeId: 99,
        ownerFullName: "Bima Santoso",
        ownerBirthDate: "1990-04-12"
      })
    );
    expect(mockApi.nodes).toHaveBeenCalledTimes(2);
  });

  it("shows duplicate node errors from the backend", async () => {
    mockApi.registerNode.mockRejectedValue(new Error("Node ID already exists."));

    render(<AdminNodesClient />);
    await screen.findByText("Ayu Lestari");

    await userEvent.click(screen.getAllByRole("button", { name: /register node/i }).at(-1)!);
    await userEvent.type(screen.getByLabelText("Node ID"), "42");
    await userEvent.type(screen.getByLabelText(/owner full name/i), "Ayu Lestari");
    await userEvent.type(screen.getByLabelText(/owner birth date/i), "1990-04-12");
    await userEvent.click(screen.getAllByRole("button", { name: /register node/i }).at(-1)!);

    expect(await screen.findByText("Node ID already exists.")).toBeInTheDocument();
  });
});
