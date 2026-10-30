"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  DEFAULT_EVENT_TYPES,
  setEventTypeCatalog,
  type EventType,
} from "@/data/event-types";

type EventTypesContextValue = {
  eventTypes: EventType[];
  addEventType: (type: EventType) => void;
};

const EventTypesContext = createContext<EventTypesContextValue>({
  eventTypes: DEFAULT_EVENT_TYPES,
  addEventType: () => {},
});

export function EventTypesProvider({
  eventTypes,
  children,
}: {
  eventTypes: EventType[];
  children: React.ReactNode;
}) {
  const [added, setAdded] = useState<EventType[]>([]);
  const addEventType = useCallback((type: EventType) => {
    setAdded((prev) => [...prev.filter((existing) => existing.id !== type.id), type]);
  }, []);
  const value = useMemo(() => {
    const merged = [
      ...eventTypes,
      ...added.filter((type) => !eventTypes.some((existing) => existing.id === type.id)),
    ];
    setEventTypeCatalog(merged);
    return { eventTypes: merged, addEventType };
  }, [eventTypes, added, addEventType]);
  return <EventTypesContext.Provider value={value}>{children}</EventTypesContext.Provider>;
}

/** Every managed event type, including hidden ones (for labelling existing records). */
export function useEventTypes(): EventType[] {
  return useContext(EventTypesContext).eventTypes;
}

/** Makes a newly created type available app-wide before the server list refreshes. */
export function useAddEventType(): (type: EventType) => void {
  return useContext(EventTypesContext).addEventType;
}
