import { withApiErrorHandling } from "@/lib/apiError";
import { clearSession } from "@/lib/session";

export async function POST() {
  return withApiErrorHandling(async () => {
    await clearSession();
    return new Response(null, { status: 204 });
  });
}
