"use client";

import { useRef } from "react";
import { Braces } from "lucide-react";
import { PRODUCT_COPY_TAGS } from "@/data/product-copy-templates";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type AdminCopyTagHelperProps = {
  /** Current field value. */
  value: string;
  onChange: (next: string) => void;
  /** Input or textarea to insert into (cursor-aware when possible). */
  targetRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  className?: string;
};

export function AdminCopyTagHelper({
  value,
  onChange,
  targetRef,
  className,
}: AdminCopyTagHelperProps) {
  const openRef = useRef(false);

  function insertTag(tag: string) {
    const el = targetRef.current;
    if (!el) {
      onChange(`${value}${tag}`);
      return;
    }

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${tag}${value.slice(end)}`;
    onChange(next);

    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + tag.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <Popover
      onOpenChange={(open) => {
        openRef.current = open;
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className ?? "rounded-2xl"}
        >
          <Braces className="size-3.5" aria-hidden />
          Insert tag
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3 p-4" align="end">
        <div>
          <p className="font-heading text-sm font-semibold">Copy tags</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click a tag to insert it at the cursor. It updates when shoppers
            pick a color.
          </p>
        </div>
        <ul className="space-y-2">
          {PRODUCT_COPY_TAGS.map((item) => (
            <li key={item.tag}>
              <button
                type="button"
                onClick={() => insertTag(item.tag)}
                className="flex w-full flex-col gap-0.5 rounded-2xl border border-border/40 bg-background/50 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="font-mono text-xs font-semibold text-primary">
                  {item.tag}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {item.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.description} Example: {item.example}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
