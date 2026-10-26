"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Search, UserRound, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCustomerNumber, type CustomerKind } from "@/data/customers";
import type { CustomerLanguage } from "@/data/customer-language";
import { CUSTOMER_KIND_ICONS, readJson } from "@/components/admin/customers/customer-ui";
import { cn } from "@/lib/utils";

export type PickedCustomer = {
  id: string;
  customer_number: number;
  display_name: string;
  company_name: string | null;
  primary_email: string;
  phone: string | null;
  kind: CustomerKind;
  preferred_language: CustomerLanguage;
};

/** Search-as-you-type customer selector backed by /api/admin/customers. */
export function CustomerPicker({
  value,
  onChange,
  id,
  placeholder = "Search name, company, email or C-1001",
}: {
  value: PickedCustomer | null;
  onChange: (customer: PickedCustomer | null) => void;
  id?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (value || !open) return;
    const ticket = ++requestRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/customers?q=${encodeURIComponent(query)}`);
        const json = await readJson<{ customers?: PickedCustomer[] }>(response);
        if (ticket === requestRef.current) {
          setResults(json.customers ?? []);
          setSearchedQuery(query);
        }
      } finally {
        if (ticket === requestRef.current) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [query, open, value]);

  if (value) {
    const Icon = CUSTOMER_KIND_ICONS[value.kind] ?? UserRound;
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-primary/50 bg-primary/10 p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {value.display_name}
            {value.company_name ? <span className="text-muted-foreground"> · {value.company_name}</span> : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatCustomerNumber(value.customer_number)} · {value.primary_email} · {value.preferred_language.toUpperCase()}
          </p>
        </div>
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3.5" />
        </span>
        <button
          type="button"
          aria-label="Change customer"
          className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
          onClick={() => {
            onChange(null);
            setOpen(true);
          }}
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-9"
          autoComplete="off"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {open ? (
        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/50 px-4 py-4 text-center text-xs text-muted-foreground">
              {loading || searchedQuery !== query
                ? "Searching…"
                : query
                  ? "No customer matches. Create them from the Customers page first."
                  : "No customers yet."}
            </p>
          ) : (
            results.map((customer) => {
              const Icon = CUSTOMER_KIND_ICONS[customer.kind] ?? UserRound;
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    onChange(customer);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-card/40 p-3 text-left transition-colors",
                    "hover:border-primary/30 hover:bg-card/60"
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {customer.display_name}
                      {customer.company_name ? (
                        <span className="text-muted-foreground"> · {customer.company_name}</span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {formatCustomerNumber(customer.customer_number)} · {customer.primary_email}
                    </span>
                  </span>
                  <span className="size-5 shrink-0 rounded-full border border-border/60" aria-hidden />
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
