import crypto from "node:crypto";
import type { AppConfig } from "../../config/env";
import argon2 from "argon2";

export const hashPassword = async (password: string): Promise<string> => argon2.hash(password);

export const verifyPassword = async (hash: string, password: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};

export const createSessionToken = (): string => crypto.randomBytes(32).toString("base64url");

export const hashSessionToken = (config: AppConfig, token: string): string =>
  crypto.createHmac("sha256", config.SESSION_SECRET).update(token).digest("hex");

export const createAdminId = (): string => crypto.randomUUID();
