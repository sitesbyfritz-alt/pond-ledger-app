import type { LucideIcon } from "lucide-react";

/** Thin placeholder for routes that arrive in later milestones. Keeps navigation
 *  honest without pretending the feature exists yet. */
export function ComingSoon({
  icon: Icon,
  title,
  milestone,
  children,
}: {
  icon: LucideIcon;
  title: string;
  milestone: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="h-7 w-7" />
      </span>
      <div>
        <h1 className="font-display text-xl font-semibold">{title}</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          {children ?? `Arriving in ${milestone}.`}
        </p>
      </div>
      <span className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">
        {milestone}
      </span>
    </div>
  );
}
