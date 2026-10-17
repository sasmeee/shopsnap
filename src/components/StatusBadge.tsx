import { Check, CircleAlert, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const STYLES = {
  paid: {
    label: "Paid",
    Icon: Check,
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  partial: {
    label: "Partial",
    Icon: Clock,
    cls: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  },
  unpaid: {
    label: "Unpaid",
    Icon: CircleAlert,
    cls: "bg-red-500/15 text-red-700 dark:text-red-400",
  },
} as const;

export function StatusBadge({ status }: { status: keyof typeof STYLES }) {
  const { label, Icon, cls } = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        cls,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}
