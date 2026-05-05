import type { AppContext } from "../../http/appContext";
import type { AuthenticatedAdmin } from "../../http/requestTypes";
import { ObjectId } from "mongodb";
import {
  createAdminId,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword
} from "./identity";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export const bootstrapAdmin = async (context: AppContext): Promise<void> => {
  const username = context.config.ADMIN_BOOTSTRAP_USERNAME.toLowerCase();
  const existing = await context.mongo.collections.adminUsers.findOne({ username });
  if (existing) {
    return;
  }

  const now = new Date();
  await context.mongo.collections.adminUsers.insertOne({
    _id: new ObjectId(),
    adminId: createAdminId(),
    username,
    passwordHash: await hashPassword(context.config.ADMIN_BOOTSTRAP_PASSWORD),
    displayName: context.config.ADMIN_BOOTSTRAP_DISPLAY_NAME,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  });
};

export const authenticateAdmin = async (
  context: AppContext,
  usernameInput: string,
  password: string
): Promise<{ token: string; admin: AuthenticatedAdmin } | null> => {
  const username = usernameInput.toLowerCase();
  const admin = await context.mongo.collections.adminUsers.findOne({ username, isActive: true });
  if (!admin) {
    return null;
  }

  const passwordOk = await verifyPassword(admin.passwordHash, password);
  if (!passwordOk) {
    return null;
  }

  const token = createSessionToken();
  const now = new Date();
  await context.mongo.collections.userSessions.insertOne({
    _id: new ObjectId(),
    sessionId: cryptoRandomId(),
    tokenHash: hashSessionToken(context.config, token),
    role: "admin",
    adminId: admin.adminId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    revokedAt: null
  });
  await context.mongo.collections.adminUsers.updateOne(
    { adminId: admin.adminId },
    { $set: { lastLoginAt: now, updatedAt: now } }
  );

  return {
    token,
    admin: {
      adminId: admin.adminId,
      username: admin.username,
      displayName: admin.displayName
    }
  };
};

export const findAdminBySessionToken = async (
  context: AppContext,
  token: string | undefined
): Promise<AuthenticatedAdmin | null> => {
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(context.config, token);
  const session = await context.mongo.collections.userSessions.findOne({
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() }
  });
  if (!session) {
    return null;
  }

  const admin = await context.mongo.collections.adminUsers.findOne({
    adminId: session.adminId,
    isActive: true
  });
  if (!admin) {
    return null;
  }

  return {
    adminId: admin.adminId,
    username: admin.username,
    displayName: admin.displayName
  };
};

export const revokeSessionToken = async (
  context: AppContext,
  token: string | undefined
): Promise<void> => {
  if (!token) {
    return;
  }

  await context.mongo.collections.userSessions.updateOne(
    { tokenHash: hashSessionToken(context.config, token), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
};

const cryptoRandomId = (): string => {
  return createSessionToken();
};
