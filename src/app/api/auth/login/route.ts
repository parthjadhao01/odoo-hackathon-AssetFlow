import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { withApiErrorHandling } from "@/lib/apiError";
import { ForbiddenError } from "@/lib/authz";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/schemas/auth";

export async function POST(request: Request) {
  return withApiErrorHandling(async () => {
    const { email, password } = loginSchema.parse(await request.json());

    const employee = await prisma.employee.findUnique({ where: { email } });

    // Generic message for both "no such user" and "wrong password" — never
    // reveal which one it was.
    const invalidCredentials = () =>
      Response.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid email or password" } },
        { status: 401 },
      );

    if (!employee) return invalidCredentials();

    const passwordMatches = await bcrypt.compare(password, employee.passwordHash);
    if (!passwordMatches) return invalidCredentials();

    // Correct credentials but a deactivated account: safe to be explicit
    // here since the caller already proved they know the password.
    if (employee.status === "INACTIVE") {
      throw new ForbiddenError("Account is deactivated.");
    }

    await createSession({
      employeeId: employee.id,
      role: employee.role,
      departmentId: employee.departmentId,
    });

    return Response.json({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
    });
  });
}
