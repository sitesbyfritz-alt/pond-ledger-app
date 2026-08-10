"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const inputBase =
  "mt-1.5 h-12 w-full rounded-xl border border-border bg-secondary/50 px-4 text-base outline-none transition focus:border-primary focus-ring";

/** Labelled text/number input. Large touch target for fast field entry. */
export const Field = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; prefix?: string }
>(({ label, hint, prefix, className, ...props }, ref) => (
  <label className="mt-4 block first:mt-0">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          {prefix}
        </span>
      )}
      <input ref={ref} className={cn(inputBase, prefix && "pl-9", className)} {...props} />
    </div>
    {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
  </label>
));
Field.displayName = "Field";

/** Labelled select. */
export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputBase, "appearance-none")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
