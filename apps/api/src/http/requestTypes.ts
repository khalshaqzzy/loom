export interface AuthenticatedAdmin {
  adminId: string;
  username: string;
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
      requestId?: string;
      validatedQuery?: unknown;
    }
  }
}

export {};
