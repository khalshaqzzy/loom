import type { FullConfig } from "@playwright/test";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(dirname, "../../..");

const waitForUrl = async (url: string, timeoutMs = 120_000): Promise<void> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const getFreePort = async (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address) {
        const port = address.port;
        server.close(() => resolve(port));
        return;
      }
      server.close(() => reject(new Error("Unable to allocate a TCP port.")));
    });
  });

const spawnProcess = (
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  name: string
): ChildProcess => {
  const child = spawn(command, args, {
    cwd: workspaceRoot,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout?.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr?.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      process.stderr.write(`[${name}] exited with code ${code}${signal ? ` (${signal})` : ""}\n`);
    }
  });

  return child;
};

const stopProcess = async (child: ChildProcess | undefined): Promise<void> => {
  if (!child || child.killed) return;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    child.kill();
    setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
      resolve();
    }, 5_000).unref();
  });
};

export default async function globalSetup(_config: FullConfig) {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const apiPort = await getFreePort();
  const webPort = await getFreePort();
  const apiUrl = `http://127.0.0.1:${apiPort}`;
  const webUrl = `http://127.0.0.1:${webPort}`;

  let api: ChildProcess | undefined;
  let web: ChildProcess | undefined;

  try {
    api = spawnProcess(
      "node",
      ["apps/api/dist/server.js"],
      {
        NODE_ENV: "test",
        PORT: String(apiPort),
        MONGO_URI: replSet.getUri(),
        MONGO_DB_NAME: "loom_e2e",
        CORS_ORIGIN: webUrl,
        SESSION_SECRET: "e2e-session-secret-000000000000000000",
        OWNER_BIRTHDATE_HASH_SECRET: "e2e-birthdate-secret-000000000000000",
        ADMIN_BOOTSTRAP_USERNAME: "admin",
        ADMIN_BOOTSTRAP_PASSWORD: "change-me-test-password",
        ADMIN_BOOTSTRAP_DISPLAY_NAME: "LOOM Admin",
        COOKIE_SECURE: "false"
      },
      "api"
    );

    await waitForUrl(`${apiUrl}/ready`);

    web = spawnProcess(
      "node",
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(webPort),
        "apps/web"
      ],
      {
        NEXT_PUBLIC_API_BASE_URL: apiUrl,
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: ""
      },
      "web"
    );

    await waitForUrl(webUrl);
  } catch (error) {
    await stopProcess(web);
    await stopProcess(api);
    await replSet.stop();
    throw error;
  }

  process.env.LOOM_E2E_API_URL = apiUrl;
  process.env.LOOM_E2E_WEB_URL = webUrl;

  return async () => {
    await stopProcess(web);
    await stopProcess(api);
    await replSet.stop();
  };
}
