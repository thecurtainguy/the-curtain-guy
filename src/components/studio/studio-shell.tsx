"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  SlidersHorizontal,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

type StudioShellProps = {
  toolbar: React.ReactNode;
  leftRail: React.ReactNode;
  rightRail: React.ReactNode;
  mobileLeftRail: React.ReactNode;
  mobileRightRail: React.ReactNode;
  children: React.ReactNode;
  toolsOpen: boolean;
  onToolsOpenChange: (open: boolean) => void;
  propertiesOpen: boolean;
  onPropertiesOpenChange: (open: boolean) => void;
  className?: string;
};

const RAILS_STORAGE_KEY = "tcg-studio-rails-v1";
const RAILS_EVENT = "tcg-studio-rails-change";
const DEFAULT_RAILS = "11";

type RailSide = "left" | "right";

function readRails(): string {
  try {
    const stored = window.localStorage.getItem(RAILS_STORAGE_KEY);
    return stored && /^[01]{2}$/.test(stored) ? stored : DEFAULT_RAILS;
  } catch {
    return DEFAULT_RAILS;
  }
}

function subscribeRails(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(RAILS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RAILS_EVENT, onChange);
  };
}

/** Desktop rail open/closed state, persisted in localStorage. */
function useRailState() {
  const rails = useSyncExternalStore(
    subscribeRails,
    readRails,
    () => DEFAULT_RAILS
  );
  const toggle = useCallback((side: RailSide) => {
    const current = readRails();
    const next =
      side === "left"
        ? `${current[0] === "1" ? "0" : "1"}${current[1]}`
        : `${current[0]}${current[1] === "1" ? "0" : "1"}`;
    try {
      window.localStorage.setItem(RAILS_STORAGE_KEY, next);
    } catch {
      // Rail preference is best-effort.
    }
    window.dispatchEvent(new Event(RAILS_EVENT));
  }, []);
  return { leftOpen: rails[0] === "1", rightOpen: rails[1] === "1", toggle };
}

export function StudioShell({
  toolbar,
  leftRail,
  rightRail,
  mobileLeftRail,
  mobileRightRail,
  children,
  toolsOpen,
  onToolsOpenChange,
  propertiesOpen,
  onPropertiesOpenChange,
  className,
}: StudioShellProps) {
  const { leftOpen, rightOpen, toggle } = useRailState();

  return (
    <section
      className={cn(
        "relative flex h-full min-h-[560px] w-full min-w-0 flex-col overflow-hidden rounded-4xl border border-border/60 bg-background text-foreground shadow-[0_24px_80px_-36px_rgba(0,0,0,0.65)] lg:min-h-0",
        className
      )}
      aria-label="Curtain Studio designer"
    >
      {toolbar}
      <div
        className="relative grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] transition-[grid-template-columns] duration-300 ease-out motion-reduce:transition-none lg:grid-cols-[var(--studio-left-rail)_minmax(0,1fr)_var(--studio-right-rail)]"
        style={
          {
            "--studio-left-rail": leftOpen ? "320px" : "44px",
            "--studio-right-rail": rightOpen ? "340px" : "44px",
          } as React.CSSProperties
        }
      >
        <div className="relative hidden min-h-0 overflow-hidden border-r border-border/60 lg:block">
          {leftOpen ? (
            <div className="h-full min-h-0">{leftRail}</div>
          ) : (
            <CollapsedRail
              label="Design tools"
              icon={Wand2}
              toggleIcon={PanelLeftOpen}
              onExpand={() => toggle("left")}
            />
          )}
        </div>
        <main className="relative h-full min-h-0 min-w-0 overflow-hidden">
          {children}
        </main>
        <div className="relative hidden min-h-0 overflow-hidden border-l border-border/60 lg:block">
          {rightOpen ? (
            <div className="h-full min-h-0">{rightRail}</div>
          ) : (
            <CollapsedRail
              label="Inspector"
              icon={SlidersHorizontal}
              toggleIcon={PanelRightOpen}
              onExpand={() => toggle("right")}
            />
          )}
        </div>
        <RailToggle
          side="left"
          label={leftOpen ? "Collapse design tools" : "Expand design tools"}
          icon={leftOpen ? PanelLeftClose : PanelLeftOpen}
          onClick={() => toggle("left")}
        />
        <RailToggle
          side="right"
          label={rightOpen ? "Collapse inspector" : "Expand inspector"}
          icon={rightOpen ? PanelRightClose : PanelRightOpen}
          onClick={() => toggle("right")}
        />
      </div>

      <Sheet open={toolsOpen} onOpenChange={onToolsOpenChange}>
        <SheetContent
          side="left"
          className="w-[min(94vw,380px)] overflow-y-auto"
        >
          <SheetHeader className="border-b border-border/60">
            <SheetTitle>Design tools</SheetTitle>
            <SheetDescription>Set the room and add treatments.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">{mobileLeftRail}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={propertiesOpen} onOpenChange={onPropertiesOpenChange}>
        <SheetContent
          side="right"
          className="w-[min(94vw,400px)] overflow-y-auto"
        >
          <SheetHeader className="border-b border-border/60">
            <SheetTitle>Properties</SheetTitle>
            <SheetDescription>
              Inspect and refine the current selection.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">{mobileRightRail}</div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

/** Small tab straddling the rail border. */
function RailToggle({
  side,
  label,
  icon: Icon,
  onClick,
}: {
  side: RailSide;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "absolute top-1/2 z-20 hidden h-12 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-card/90 text-muted-foreground shadow-lg backdrop-blur transition-[left,right,color,border-color] duration-300 ease-out hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none lg:flex",
        side === "left"
          ? "left-[calc(var(--studio-left-rail)-10px)]"
          : "right-[calc(var(--studio-right-rail)-10px)]"
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
    </button>
  );
}

function CollapsedRail({
  label,
  icon: Icon,
  toggleIcon: ToggleIcon,
  onExpand,
}: {
  label: string;
  icon: LucideIcon;
  toggleIcon: LucideIcon;
  onExpand: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`Expand ${label.toLowerCase()}`}
      title={`Expand ${label.toLowerCase()}`}
      className="group flex h-full w-full flex-col items-center gap-3 bg-card/35 py-3 text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <span className="flex size-8 items-center justify-center rounded-xl border border-border/60 bg-background/50 group-hover:border-primary/40">
        <ToggleIcon className="size-4" aria-hidden="true" />
      </span>
      <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="text-[0.62rem] font-semibold tracking-[0.2em] uppercase [writing-mode:vertical-rl]">
        {label}
      </span>
    </button>
  );
}
