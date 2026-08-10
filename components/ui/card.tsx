import * as React from "react";
import { cn } from "@/lib/utils";

/** Premium surface card. `interactive` adds the lift-on-hover treatment. */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("surface p-5", interactive && "surface-hover", className)}
    {...props}
  />
));
Card.displayName = "Card";
