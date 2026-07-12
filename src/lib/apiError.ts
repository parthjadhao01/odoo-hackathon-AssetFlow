import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/authz";

type ErrorBody = { error: { code: string; message: string } };

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
