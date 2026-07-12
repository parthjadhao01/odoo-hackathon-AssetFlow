/** Mirrors the `{ error: { code, message, details? } }` envelope from apiError.ts. */
export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    return new ApiError(
      body?.error?.message ?? "Something went wrong",
      body?.error?.code ?? "UNKNOWN",
      body?.error?.details,
    );
  } catch {
    return new ApiError("Something went wrong", "UNKNOWN");
  }
}

export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json();
}

/** POST/PATCH helper sharing the same error shape as `fetcher`. */
export async function apiRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response.json();
}