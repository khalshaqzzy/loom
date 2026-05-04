import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminLoginClient } from "@/components/admin/AdminLoginClient";
import { api } from "@/lib/api";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace })
}));

vi.mock("@/lib/api", () => ({
  api: {
    login: vi.fn()
  }
}));

const mockApi = vi.mocked(api);

describe("AdminLoginClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in and routes to the admin dashboard", async () => {
    mockApi.login.mockResolvedValue({
      ok: true,
      authenticated: true,
      admin: { adminId: "admin-1", username: "admin", displayName: "Admin" }
    });

    render(<AdminLoginClient />);
    await userEvent.type(screen.getByLabelText(/username/i), "admin");
    await userEvent.type(screen.getByLabelText(/password/i), "password");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(mockApi.login).toHaveBeenCalledWith({ username: "admin", password: "password" }));
    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("shows backend login errors without exposing extra state", async () => {
    mockApi.login.mockRejectedValue(new Error("Invalid username or password."));

    render(<AdminLoginClient />);
    await userEvent.type(screen.getByLabelText(/username/i), "admin");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText("Invalid username or password.")).toBeInTheDocument();
  });
});
