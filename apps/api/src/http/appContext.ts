import type { AppConfig } from "../config/env";
import type { MongoContext } from "../db/client";
import type { AuditWriter } from "../modules/audit/auditService";
import type { Logger } from "pino";

export interface AppContext {
  config: AppConfig;
  mongo: MongoContext;
  audit: AuditWriter;
  logger: Logger;
}
