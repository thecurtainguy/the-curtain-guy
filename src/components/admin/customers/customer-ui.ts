import {
  Briefcase,
  Building2,
  CalendarHeart,
  Landmark,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  CUSTOMER_KINDS,
  CUSTOMER_KIND_DESCRIPTIONS,
  CUSTOMER_KIND_LABELS,
  type CustomerKind,
} from "@/data/customers";
import type { EstimateOption } from "@/data/estimate";

export const CUSTOMER_KIND_ICONS: Record<CustomerKind, LucideIcon> = {
  individual: User,
  company: Building2,
  planner: CalendarHeart,
  venue: Landmark,
  corporate: Briefcase,
};

export const CUSTOMER_KIND_OPTIONS: EstimateOption[] = CUSTOMER_KINDS.map((kind) => ({
  id: kind,
  label: CUSTOMER_KIND_LABELS[kind],
  description: CUSTOMER_KIND_DESCRIPTIONS[kind],
  icon: CUSTOMER_KIND_ICONS[kind],
}));

export async function readJson<T>(response: Response): Promise<T & { ok?: boolean; message?: string }> {
  return (await response.json().catch(() => ({}))) as T & { ok?: boolean; message?: string };
}
