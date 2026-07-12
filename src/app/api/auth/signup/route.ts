import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { withApiErrorHandling } from "@/lib/apiError";
import { createSession } from "@/lib/session";
import { signupSchema } from "@/lib/schemas/auth";

export async function POST(request: Request) {
  return withApiErrorHandling(async () => {
    const { name, email, password } = signupSchema.parse(await request.json());

    const passwordHash = await bcrypt.hash(password, 10);

    let employee;
    try {
      // `role` is hardcoded here, never taken from the request body — this is
      // the single choke point for account creation (spec §2.1/§2.3).
      employee = await prisma.employee.create({
        data: { name, email, passwordHash, role: "EMPLOYEE" },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return Response.json(
          { error: { code: "CONFLICT", message: "Email already in use" } },
          { status: 409 },
        );
      }
      throw err;
    }

    await createSession({
      employeeId: employee.id,
      role: employee.role,
      departmentId: employee.departmentId,
    });

    return Response.json(
      {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
      { status: 201 },
    );
  });
}
