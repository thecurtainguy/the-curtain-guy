import {
  Armchair,
  Blinds,
  CloudSun,
  Flower2,
  Lightbulb,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { StudioBomSection } from "@/lib/studio-bom";

export const STUDIO_QUOTE_SECTION_ICONS: Record<StudioBomSection, LucideIcon> = {
  drapery: Blinds,
  hardware: Wrench,
  treatments: Flower2,
  ceiling: CloudSun,
  lighting: Lightbulb,
  furniture: Armchair,
  services: Truck,
};
