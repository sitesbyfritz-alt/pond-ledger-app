"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { Fab } from "./fab";
import { cn } from "@/lib/utils";

/** Mobile-only bottom nav with the daily-log FAB in the center notch.
 *  Four nav items split two-and-two around the FAB. */
export function BottomNav() {
  const pathname = usePathname();
  const left = NAV_ITEMS.slice(0, 2);
  const right = NAV_ITEMS.slice(2);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between px-2">
        <div className="flex flex-1 justify-around">
          {left.map((item) => (
            <Item key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
        <Fab />
        <div className="flex flex-1 justify-around">
          {right.map((item) => (
            <Item key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function Item({
  item,
  pathname,
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
}) {
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium transition focus-ring",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      {item.label}
    </Link>
  );
}
