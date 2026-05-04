import { describe, expect, it } from "vitest";
import { formatJakartaTime, messageLabel } from "@/lib/labels";

describe("labels", () => {
  it("renders canonical message values as readable labels", () => {
    expect(messageLabel("medical_help")).toBe("Medical help");
    expect(messageLabel("fine")).toBe("Safe");
  });

  it("formats timestamps in Asia/Jakarta", () => {
    expect(formatJakartaTime("2026-05-04T00:00:00.000Z")).toContain("2026");
  });
});
