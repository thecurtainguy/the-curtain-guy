"use client";

import { createContext, useContext } from "react";
import type {
  StudioEventDetails,
  StudioLeadContact,
} from "@/data/studio-leads";

export type StudioLeadContextValue = {
  details: StudioEventDetails;
  contact: StudioLeadContact | null;
  /** Current studio row id, writing a draft first when none exists yet. */
  ensureDesignId: () => Promise<string | null>;
  openEventDetails: () => void;
};

const StudioLeadContext = createContext<StudioLeadContextValue | null>(null);

export const StudioLeadProvider = StudioLeadContext.Provider;

/** Null outside the studio designer (e.g. the standalone event builder wizard). */
export function useOptionalStudioLead(): StudioLeadContextValue | null {
  return useContext(StudioLeadContext);
}
