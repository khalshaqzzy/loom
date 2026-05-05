import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    MONGO_URI: z.string().min(1).default("mongodb://127.0.0.1:27017"),
    MONGO_DB_NAME: z.string().min(1).default("loom"),
    CORS_ORIGIN: z.string().url().default("https://loomnetwork.site"),
    SESSION_SECRET: z.string().default("dev-session-secret-change-before-production"),
    OWNER_BIRTHDATE_HASH_SECRET: z.string().optional(),
    ADMIN_BOOTSTRAP_USERNAME: z.string().min(1).default("admin"),
    ADMIN_BOOTSTRAP_PASSWORD: z.string().default("change-me-admin-password"),
    ADMIN_BOOTSTRAP_DISPLAY_NAME: z.string().min(1).default("LOOM Admin"),
    COOKIE_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true")
  })
  .transform((env) => ({
    ...env,
    OWNER_BIRTHDATE_HASH_SECRET: env.OWNER_BIRTHDATE_HASH_SECRET ?? env.SESSION_SECRET
  }));

export type AppConfig = z.infer<typeof envSchema>;

export const loadConfig = (input: Record<string, string | undefined> = process.env): AppConfig =>
  envSchema.parse(input);
