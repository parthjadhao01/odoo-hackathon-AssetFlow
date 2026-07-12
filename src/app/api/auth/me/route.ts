import { prisma } from "@/lib/db";
import { withApiErrorHandling } from "@/lib/apiError";
import { requireAuth } from "@/lib/authz";

export async function GET() {
  return withApiErrorHandling(async () => {
    const session = await requireAuth();

    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: session.employeeId },
      select: { id: true, name: true, email: true, role: true, departmentId: true },
    });

    return Response.json(employee);
  });
}
