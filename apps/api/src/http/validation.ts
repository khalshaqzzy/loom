import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { HttpError } from "./errors";

export const validateBody =
  <T>(schema: ZodSchema<T>) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(
        new HttpError(400, "invalid_request", result.error.issues[0]?.message ?? "Invalid request.")
      );
      return;
    }
    request.body = result.data;
    next();
  };

export const validateQuery =
  <T>(schema: ZodSchema<T>) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      next(
        new HttpError(400, "invalid_query", result.error.issues[0]?.message ?? "Invalid query.")
      );
      return;
    }
    request.validatedQuery = result.data;
    next();
  };
