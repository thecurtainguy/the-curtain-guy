"use client";

import { useLocale } from "next-intl";

/**
 * Labels for the read-only event plan view that the wizard copy does not
 * already provide. Kept beside the component (en + fr) like `wizard-copy.ts`.
 */
const EN = {
  briefEyebrow: "Event brief",
  contact: "Contact",
  yourContact: "Your contact",
  date: "Date",
  venue: "Venue",
  linkedAccount: "Linked account",
  guestCheckout: "No account",
  notes: "Customer notes",
  yourNotes: "Your notes",
  dimensions: "Dimensions",
  cutout: "Cutout",
  ceilingHeight: "Ceiling height",
  fabricDirection: "Fabric direction",
  noSetups: "No setups selected.",
  designCounts: (treatments: number, runs: number) =>
    `${treatments} ${treatments === 1 ? "treatment" : "treatments"} · ${runs} drape ${runs === 1 ? "run" : "runs"}`,
  showAll: (n: number) => `Show all ${n}`,
  showMore: "Show all",
  showLess: "Show less",
};

type EventPlanSavedCopy = typeof EN;

const FR: EventPlanSavedCopy = {
  briefEyebrow: "Brief d’événement",
  contact: "Contact",
  yourContact: "Vos coordonnées",
  date: "Date",
  venue: "Lieu",
  linkedAccount: "Compte lié",
  guestCheckout: "Sans compte",
  notes: "Notes du client",
  yourNotes: "Vos notes",
  dimensions: "Dimensions",
  cutout: "Découpe",
  ceilingHeight: "Hauteur du plafond",
  fabricDirection: "Direction du tissu",
  noSetups: "Aucune installation sélectionnée.",
  designCounts: (treatments, runs) =>
    `${treatments} traitement${treatments > 1 ? "s" : ""} · ${runs} tracé${runs > 1 ? "s" : ""} de draperie`,
  showAll: (n) => `Tout afficher (${n})`,
  showMore: "Tout afficher",
  showLess: "Afficher moins",
};

export function useEventPlanSavedCopy(): EventPlanSavedCopy {
  const locale = useLocale();
  return locale.startsWith("fr") ? FR : EN;
}
