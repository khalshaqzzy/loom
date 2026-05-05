import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminMessagesClient } from "@/components/admin/AdminMessagesClient";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    adminMessages: vi.fn()
  }
}));

const mockApi = vi.mocked(api);

describe("AdminMessagesClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.adminMessages.mockResolvedValue({
      messages: [
        {
          messageId: "m1",
          dedupKey: "42:1",
          senderNodeId: 42,
          seqId: 1,
          senderRangeToGateway: 2,
          lastForwarderRangeToGateway: 1,
          timestamp: "2026-05-04T00:00:00.000Z",
          lat: -6.2,
          lon: 106.8,
          message: "fine",
          receivedByNodeId: null,
          receivedByUploaderId: "mobile-1",
          source: "mobile_app",
          receivedByBackendAt: "2026-05-04T00:01:00.000Z"
        }
      ],
      nextCursor: null
    });
  });

  it("loads message history", async () => {
    render(<AdminMessagesClient />);

    expect(await screen.findByText("Safe")).toBeInTheDocument();
    expect(mockApi.adminMessages).toHaveBeenCalledWith(expect.any(URLSearchParams));
  });

  it("sends node, owner, and message filters to the backend", async () => {
    render(<AdminMessagesClient />);
    await screen.findByText("Safe");

    await userEvent.type(screen.getByLabelText("Node ID"), "42");
    await userEvent.type(screen.getByLabelText("Owner name"), "Ayu");
    await userEvent.selectOptions(screen.getByLabelText("Message value"), "medical_help");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => expect(mockApi.adminMessages).toHaveBeenCalledTimes(2));
    const params = mockApi.adminMessages.mock.calls.at(-1)?.[0];
    expect(params?.get("nodeId")).toBe("42");
    expect(params?.get("ownerName")).toBe("Ayu");
    expect(params?.get("message")).toBe("medical_help");
  });

  it("shows an empty state when no messages match", async () => {
    mockApi.adminMessages.mockResolvedValue({ messages: [], nextCursor: null });

    render(<AdminMessagesClient />);

    expect(await screen.findByText("No messages found")).toBeInTheDocument();
    expect(screen.getByText(/No messages match these filters/i)).toBeInTheDocument();
  });
});
