import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  iconClassName,
  wordmarkClassName,
}: {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
          iconClassName,
        )}
      >
        <Boxes className="size-4.5" />
      </span>
      <span
        className={cn(
          "font-heading text-lg font-semibold tracking-tight text-foreground",
          wordmarkClassName,
        )}
      >
        AssetFlow
      </span>
    </div>
  );
}
