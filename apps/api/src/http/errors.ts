export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;

  public constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const isDuplicateKeyError = (error: unknown): boolean => {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
};
