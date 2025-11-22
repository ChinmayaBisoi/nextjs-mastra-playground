"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface WebSearchToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function WebSearchToggle({
  checked,
  onCheckedChange,
}: WebSearchToggleProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="web-search">Enable Web Search</Label>
          <p className="text-sm text-muted-foreground">
            Use real-time web data to enhance your presentation
          </p>
        </div>
        <button
          id="web-search"
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onCheckedChange(!checked)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
            checked ? "bg-primary" : "bg-input"
          )}
        >
          <span
            className={cn(
              "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
              checked ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>
    </div>
  );
}
