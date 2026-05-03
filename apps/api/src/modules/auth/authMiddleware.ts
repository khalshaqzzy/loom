import type { NextFunction, Request, Response } from "express";
import type { AppContext } from "../../http/appContext";
import { HttpError } from "../../http/errors";
import { findAdminBySessionToken } from "./authService";

export const ADMIN_SESSION_COOKIE = "loom_admin_session";

export const requireAdmin =
  (context: AppContext) =>
  async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    const admin = await findAdminBySessionToken(context, request.cookies?.[ADMIN_SESSION_COOKIE]);
    if (!admin) {
      next(new HttpError(401, "unauthorized", "Admin authentication required."));
      return;
    }

    request.admin = admin;
    next();
  };
