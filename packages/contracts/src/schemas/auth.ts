import { z } from "zod";

export const adminLoginRequestSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200)
});

export const adminSessionResponseSchema = z.object({
  authenticated: z.boolean(),
  admin: z
    .object({
      adminId: z.string(),
      username: z.string(),
      displayName: z.string()
    })
    .nullable()
});

export const adminLoginResponseSchema = adminSessionResponseSchema.extend({
  ok: z.literal(true)
});

export const adminLogoutResponseSchema = z.object({
  ok: z.literal(true)
});

export type AdminLoginRequest = z.infer<typeof adminLoginRequestSchema>;
export type AdminSessionResponse = z.infer<typeof adminSessionResponseSchema>;
