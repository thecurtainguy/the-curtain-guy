"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

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
  return (
    <section
      className={cn(
        "relative flex h-full min-h-[560px] w-full min-w-0 flex-col overflow-hidden rounded-4xl border border-border/60 bg-background text-foreground shadow-[0_24px_80px_-36px_rgba(0,0,0,0.65)] lg:min-h-0",
        className
      )}
      aria-label="Curtain Studio designer"
    >
      {toolbar}
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_340px]">
        <div className="hidden min-h-0 overflow-hidden border-r border-border/60 lg:block">
          {leftRail}
        </div>
        <main className="min-h-0 min-w-0 overflow-hidden">{children}</main>
        <div className="hidden min-h-0 overflow-hidden border-l border-border/60 lg:block">
          {rightRail}
        </div>
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
