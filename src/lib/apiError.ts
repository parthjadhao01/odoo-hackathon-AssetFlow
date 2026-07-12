import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/authz";

type ErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

/** Business-rule conflict (409) — org spec §6.3's error catalogue. */
export class ConflictError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ConflictError";
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

function json(status: number, body: ErrorBody) {
  return Response.json(body, { status });
}

/** Wraps a route handler body, mapping known errors to spec §5.3's shape. */
export async function withApiErrorHandling(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return json(401, { error: { code: "UNAUTHORIZED", message: err.message } });
    }
    if (err instanceof ForbiddenError) {
      return json(403, { error: { code: "FORBIDDEN", message: err.message } });
    }
    if (err instanceof NotFoundError) {
      return json(404, { error: { code: "NOT_FOUND", message: err.message } });
    }
    if (err instanceof ConflictError) {
      return json(409, {
        error: { code: err.code, message: err.message, details: err.details },
      });
    }
    if (err instanceof ZodError) {
      return json(400, {
        error: { code: "BAD_REQUEST", message: err.issues[0]?.message ?? "Invalid request body" },
      });
    }
    console.error(err);
    return json(500, {
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
  }
}
