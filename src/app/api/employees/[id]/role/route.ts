import { prisma } from "@/lib/db";
import { withApiErrorHandling } from "@/lib/apiError";
import { requireAuth, requireRole } from "@/lib/authz";
import { roleChangeSchema } from "@/lib/schemas/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();
    requireRole(session, "ADMIN");

    const { id: targetId } = await params;
    const { role: toRole } = roleChangeSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.employee.findUnique({
        where: { id: targetId },
        select: { id: true, role: true },
      });
      if (!target) return null;

      const fromRole = target.role;

      const updated = await tx.employee.update({
        where: { id: targetId },
        data: { role: toRole },
      });

      await tx.activityLog.create({
        data: {
          actorId: session.employeeId,
          targetId,
          targetType: "Employee",
          action: "ROLE_CHANGE",
          metadata: { fromRole, toRole },
        },
      });

      return updated;
    });

    if (!result) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Employee not found" } },
        { status: 404 },
      );
    }

    return Response.json({
      id: result.id,
      name: result.name,
      email: result.email,
      role: result.role,
    });
  });
}
