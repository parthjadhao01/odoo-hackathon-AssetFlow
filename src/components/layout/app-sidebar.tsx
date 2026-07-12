"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { navItems } from "@/components/layout/nav-items";

const ROLE_LABEL: Record<string, string> = {
  EMPLOYEE: "Employee",
  DEPARTMENT_HEAD: "Department Head",
  ASSET_MANAGER: "Asset Manager",
  ADMIN: "Admin",
};

export function AppSidebar({
  employeeName,
  role,
}: {
  employeeName: string;
  role: string;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="none" className="sticky top-0 h-svh">
      <SidebarHeader className="px-3 py-3">
        <Logo />
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
          {navItems
            .filter((item) => !item.roles || (item.roles as string[]).includes(role))
            .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            if (!item.enabled) {
              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    disabled
                    aria-disabled="true"
                    className="cursor-not-allowed text-muted-foreground opacity-60"
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }

            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  isActive={isActive}
                  render={<Link href={item.href} />}
                >
                  <Icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="gap-3 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {employeeName}
            </span>
            <Badge variant="secondary" className="w-fit">
              {ROLE_LABEL[role] ?? role}
            </Badge>
          </div>
        </div>
        <LogoutButton />
      </SidebarFooter>
    </Sidebar>
  );
}
