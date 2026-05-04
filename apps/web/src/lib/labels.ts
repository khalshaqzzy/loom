import type { MessageValue, NodeStatus } from "@loom/contracts";

export const messageValueOptions: Array<{ value: MessageValue; label: string; tone: string }> = [
  { value: "fine", label: "Safe", tone: "safe" },
  { value: "needs_rescue", label: "Needs rescue", tone: "critical" },
  { value: "medical_help", label: "Medical help", tone: "critical" },
  { value: "food_water", label: "Food or water", tone: "attention" },
  { value: "shelter_needed", label: "Shelter needed", tone: "attention" },
  { value: "trapped", label: "Trapped", tone: "critical" },
  { value: "danger", label: "Danger", tone: "critical" },
  { value: "unknown", label: "Unknown", tone: "unknown" }
];

export const nodeStatusLabels: Record<NodeStatus, string> = {
  registered: "Registered",
  active: "Active",
  inactive: "Inactive",
  unknown: "Unknown"
};

export const messageLabel = (value: MessageValue | string) =>
  messageValueOptions.find((option) => option.value === value)?.label ?? value;

export const formatJakartaTime = (value: string | null | undefined) => {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
};
