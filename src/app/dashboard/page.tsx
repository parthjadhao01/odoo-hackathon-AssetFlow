import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata: Metadata = {
  title: "Dashboard — AssetFlow",
};

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: "Employee",
  DEPARTMENT_HEAD: "Department Head",
  ASSET_MANAGER: "Asset Manager",
  ADMIN: "Admin",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: session.employeeId },
    select: { name: true, email: true, role: true },
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Logo />
        <LogoutButton />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome, {employee.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{employee.email}</p>
            <Badge variant="secondary" className="w-fit">
              {ROLE_LABEL[employee.role] ?? employee.role}
            </Badge>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}