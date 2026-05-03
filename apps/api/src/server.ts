import { loadConfig } from "./config/env";
import { connectMongo } from "./db/client";
import { createApp } from "./app";
import { createAuditWriter } from "./modules/audit/auditService";
import { bootstrapAdmin } from "./modules/auth/authService";
import pino from "pino";

const start = async (): Promise<void> => {
  const config = loadConfig();
  const logger = pino();
  const mongo = await connectMongo(config);
  await bootstrapAdmin({
    config,
    mongo,
    logger,
    audit: createAuditWriter(mongo.collections)
  });
  const app = createApp(config, mongo);
  app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "LOOM API listening");
  });
};

void start().catch((error) => {
  console.error(error);
  process.exit(1);
});
