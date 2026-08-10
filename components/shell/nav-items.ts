import { LayoutDashboard, Fish, LineChart, MoreHorizontal, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Single source of truth for both the desktop sidebar and mobile bottom-nav. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ponds", label: "Ponds", icon: Fish },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/more", label: "More", icon: MoreHorizontal },
];
