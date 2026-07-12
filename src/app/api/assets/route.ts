import { withApiErrorHandling } from "@/lib/apiError";
import { requireAuth, requireRole } from "@/lib/authz";
import { assetCreateSchema, assetStatusFilterSchema } from "@/lib/schemas/assets";
import { createAsset, listAssets } from "@/lib/assets";

export async function GET(request: Request) {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();

    const params = new URL(request.url).searchParams;
    const q = params.get("q") ?? undefined;
    const categoryId = params.get("categoryId") ?? undefined;
    const departmentId = params.get("departmentId") ?? undefined;
    const statusParam = params.get("status");
    const bookableParam = params.get("bookable");

    const assets = await listAssets(
      {
        q,
        categoryId,
        departmentId,
        status: statusParam ? assetStatusFilterSchema.parse(statusParam) : undefined,
        bookable: bookableParam !== null ? bookableParam === "true" : undefined,
      },
      session,
    );

    return Response.json({ assets });
  });
}

export async function POST(request: Request) {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();
    requireRole(session, "ASSET_MANAGER", "ADMIN");

    const input = assetCreateSchema.parse(await request.json());
    const asset = await createAsset(session.employeeId, input);

    return Response.json({ asset }, { status: 201 });
  });
}
