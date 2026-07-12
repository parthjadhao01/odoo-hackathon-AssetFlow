import {
  LayoutDashboard,
  Building2,
  Boxes,
  ArrowLeftRight,
  CalendarClock,
  Wrench,
  ClipboardCheck,
  FileBarChart,
  Bell,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/generated/prisma/client";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  /** Omitted = visible to every role. Present = hidden entirely for roles not listed. */
  roles?: Role[];
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: true },
  { label: "Organization setup", href: "/organization", icon: Building2, enabled: true, roles: ["ADMIN"] },
  { label: "Assets", href: "/assets", icon: Boxes, enabled: false },
  { label: "Allocation & Transfer", href: "/allocations", icon: ArrowLeftRight, enabled: false },
  { label: "Resource Booking", href: "/bookings", icon: CalendarClock, enabled: false },
  { label: "Maintenance", href: "/maintenance", icon: Wrench, enabled: false },
  { label: "Audit", href: "/audit", icon: ClipboardCheck, enabled: false },
  { label: "Reports", href: "/reports", icon: FileBarChart, enabled: false },
  { label: "Notifications", href: "/notifications", icon: Bell, enabled: false },
];
