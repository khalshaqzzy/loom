import { adminLoginRequestSchema } from "@loom/contracts";
import type { AppContext } from "../../http/appContext";
import { asyncHandler } from "../../http/asyncHandler";
import { validateBody } from "../../http/validation";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  authenticateAdmin,
  findAdminBySessionToken,
  revokeSessionToken
} from "./authService";
import { ADMIN_SESSION_COOKIE } from "./authMiddleware";
import { HttpError } from "../../http/errors";

export const createAuthRouter = (context: AppContext): Router => {
  const router = Router();
  const loginLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false
  });

  router.post(
    "/login",
    loginLimiter,
    validateBody(adminLoginRequestSchema),
    asyncHandler(async (request, response) => {
      const auth = await authenticateAdmin(context, request.body.username, request.body.password);
      if (!auth) {
        await context.audit.write({
          action: "admin.login",
          outcome: "failure",
          metadata: { username: request.body.username }
        });
        throw new HttpError(401, "invalid_credentials", "Invalid username or password.");
      }

      response.cookie(ADMIN_SESSION_COOKIE, auth.token, {
        httpOnly: true,
        secure: context.config.COOKIE_SECURE,
        sameSite: "lax",
        path: "/",
        maxAge: 1000 * 60 * 60 * 12
      });
      await context.audit.write({
        action: "admin.login",
        actorAdminId: auth.admin.adminId,
        outcome: "success"
      });
      response.json({ ok: true, authenticated: true, admin: auth.admin });
    })
  );

  router.post(
    "/logout",
    asyncHandler(async (request, response) => {
      await revokeSessionToken(context, request.cookies?.[ADMIN_SESSION_COOKIE]);
      response.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
      response.json({ ok: true });
    })
  );

  router.get(
    "/session",
    asyncHandler(async (request, response) => {
      const admin = await findAdminBySessionToken(context, request.cookies?.[ADMIN_SESSION_COOKIE]);
      response.json({ authenticated: Boolean(admin), admin });
    })
  );

  return router;
};
