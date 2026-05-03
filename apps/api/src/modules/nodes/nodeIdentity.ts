import crypto from "node:crypto";
import type { AppConfig } from "../../config/env";

export const normalizeOwnerName = (name: string): string =>
  name.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");

export const hashBirthDate = (config: Pick<AppConfig, "OWNER_BIRTHDATE_HASH_SECRET">, birthDate: string): string =>
  crypto
    .createHmac("sha256", config.OWNER_BIRTHDATE_HASH_SECRET)
    .update(birthDate)
    .digest("hex");

export const toNodeIdString = (nodeId: number): string => String(nodeId);
