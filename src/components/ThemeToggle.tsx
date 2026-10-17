"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const options: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser. Until then nothing is
  // marked active, so the server HTML and the first client render match.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const active = mounted ? theme : undefined;

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-lg border bg-muted p-0.5"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          size="icon-sm"
          variant={active === value ? "outline" : "ghost"}
          aria-label={label}
          aria-pressed={active === value}
          title={label}
          onClick={() => setTheme(value)}
        >
          <Icon aria-hidden="true" />
        </Button>
      ))}
    </div>
  );
}
