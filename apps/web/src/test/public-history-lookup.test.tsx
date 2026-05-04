import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicHistoryLookup } from "@/components/PublicHistoryLookup";

const okResponse = {
  ok: true,
  messages: [
    {
      messageId: "m1",
      dedupKey: "1:7",
      senderNodeId: 1,
      seqId: 7,
      senderRangeToGateway: 2,
      lastForwarderRangeToGateway: 1,
      timestamp: "2026-05-04T00:00:00.000Z",
      lat: null,
      lon: null,
      message: "fine",
      receivedByNodeId: null,
      receivedByUploaderId: null,
      source: "mobile_app",
      receivedByBackendAt: "2026-05-04T00:01:00.000Z"
    }
  ],
  nextCursor: null
};

describe("PublicHistoryLookup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders history after a successful privacy lookup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => okResponse
      })
    );

    render(<PublicHistoryLookup />);
    await userEvent.type(screen.getByLabelText(/owner full name/i), "Jane Doe");
    await userEvent.type(screen.getByLabelText(/owner birth date/i), "1990-04-12");
    await userEvent.click(screen.getByRole("button", { name: /search history/i }));

    await waitFor(() => expect(screen.getByText("Safe")).toBeInTheDocument());
    expect(screen.getByText("Node 1")).toBeInTheDocument();
  });

  it("keeps lookup failure generic", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ ok: false, message: "No matching message history could be returned." })
      })
    );

    render(<PublicHistoryLookup />);
    await userEvent.type(screen.getByLabelText(/owner full name/i), "Jane Doe");
    await userEvent.type(screen.getByLabelText(/owner birth date/i), "1990-04-12");
    await userEvent.click(screen.getByRole("button", { name: /search history/i }));

    await waitFor(() => expect(screen.getByText("No matching history could be returned.")).toBeInTheDocument());
  });
});
