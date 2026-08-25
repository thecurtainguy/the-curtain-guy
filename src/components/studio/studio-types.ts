import type {
  StudioDesignJson,
  StudioDesignRow,
  StudioOpening,
} from "@/data/studio";
import { clampOpeningToWall } from "@/lib/studio-geometry";

export type StudioAccessMode = "guest" | "customer" | "admin";

export type StudioSelection =
  | { kind: "wall"; index: number }
  | { kind: "drape"; id: string }
  | { kind: "treatment"; id: string }
  | { kind: "object"; id: string }
  | { kind: "opening"; id: string }
  | null;

export type StudioViewMode = "2d" | "3d";
export type StudioSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export type StudioLinkContext = {
  estimateRequestId?: string;
  quoteId?: string;
  jobId?: string;
  opportunityRef?: string;
};

export type StudioSaveResponse = {
  ok: boolean;
  design?: StudioDesignRow;
  message?: string;
};

export type StudioEditorProps = {
  design: StudioDesignJson;
  onChange: (design: StudioDesignJson) => void;
  selection: StudioSelection;
  onSelect: (selection: StudioSelection) => void;
};

export function updateOpening(
  design: StudioDesignJson,
  id: string,
  patch: Partial<StudioOpening>
): StudioDesignJson {
  return {
    ...design,
    openings: design.openings.map((opening) =>
      opening.id === id
        ? clampOpeningToWall(
            { ...opening, ...patch },
            design.room.floor
          )
        : opening
    ),
  };
}

export function parseNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function feetValue(inches: number): number {
  return Math.round((inches / 12) * 100) / 100;
}

export function feetInput(value: string, fallbackInches: number): number {
  return Math.max(0, parseNumber(value, feetValue(fallbackInches)) * 12);
}

export function signedFeetInput(
  value: string,
  fallbackInches: number
): number {
  return parseNumber(value, feetValue(fallbackInches)) * 12;
}
