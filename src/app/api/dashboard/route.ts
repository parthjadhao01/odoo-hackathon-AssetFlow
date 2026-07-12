import { withApiErrorHandling } from "@/lib/apiError";
import { requireAuth } from "@/lib/authz";
import { getDashboardData } from "@/lib/dashboard";

export async function GET() {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();
    const data = await getDashboardData(session);
    return Response.json(data);
  });
}
