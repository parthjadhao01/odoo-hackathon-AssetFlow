import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SwrProvider } from "@/components/providers/swr-provider";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: session.employeeId },
    select: { name: true, role: true },
  });

  return (
    <SwrProvider>
      <SidebarProvider>
        <AppSidebar employeeName={employee.name} role={employee.role} />
        <SidebarInset>
          <div className="flex flex-1 flex-col p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </SwrProvider>
  );
}