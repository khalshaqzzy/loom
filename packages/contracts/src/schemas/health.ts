import { z } from "zod";
import { isoDateTimeSchema } from "./primitives";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: isoDateTimeSchema
});

export const readinessResponseSchema = z.object({
  status: z.enum(["ready", "not_ready"]),
  mongo: z.boolean(),
  indexes: z.boolean(),
  timestamp: isoDateTimeSchema
});
