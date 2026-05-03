import { z } from "zod";
import { birthDateSchema, ownerFullNameSchema } from "./primitives";
import { messageHistoryResponseSchema } from "./messages";

export const publicHistoryLookupRequestSchema = z.object({
  ownerFullName: ownerFullNameSchema,
  ownerBirthDate: birthDateSchema
});

export const publicHistoryLookupSuccessResponseSchema = messageHistoryResponseSchema.extend({
  ok: z.literal(true)
});

export const publicHistoryLookupFailureResponseSchema = z.object({
  ok: z.literal(false),
  message: z.string()
});

export const publicHistoryLookupResponseSchema = z.union([
  publicHistoryLookupSuccessResponseSchema,
  publicHistoryLookupFailureResponseSchema
]);
