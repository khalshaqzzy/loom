import { z } from "zod";

export const messageSourceValues = ["mobile_app", "lora_mesh", "gateway_node"] as const;
export const messageSourceSchema = z.enum(messageSourceValues);
export type MessageSource = z.infer<typeof messageSourceSchema>;

export const nodeStatusValues = ["registered", "active", "inactive", "unknown"] as const;
export const nodeStatusSchema = z.enum(nodeStatusValues);
export type NodeStatus = z.infer<typeof nodeStatusSchema>;

export const uploaderTypeValues = ["mobile_app", "gateway_node"] as const;
export const uploaderTypeSchema = z.enum(uploaderTypeValues);
export type UploaderType = z.infer<typeof uploaderTypeSchema>;

export const messageValueValues = [
  "fine",
  "needs_rescue",
  "medical_help",
  "food_water",
  "shelter_needed",
  "trapped",
  "danger",
  "unknown"
] as const;
export const messageValueSchema = z.enum(messageValueValues);
export type MessageValue = z.infer<typeof messageValueSchema>;
