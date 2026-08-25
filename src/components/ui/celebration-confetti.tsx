"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

/** Brand gold + soft celebration accents for estimate success. */
const CONFETTI_COLORS = [
  "#d4af37", // classic gold
  "#f0d78c", // light gold
  "#c9a227", // deep gilt
  "#ffe9a8", // champagne
  "#e6c35c", // warm gilt
  "#f5f0e6", // cream
  "#e8b4b8", // soft rose
  "#7eb8c9", // soft teal
  "#b8a9d4", // soft lilac
  "#f2c4a0", // soft peach
  "#ffffff",
];

const GOLD_COLORS = ["#d4af37", "#f0d78c", "#c9a227", "#ffe9a8", "#e6c35c", "#ffffff"];

/**
 * Plentiful multi-second confetti easter egg for estimate submission success.
 * Respects prefers-reduced-motion.
 */
export function CelebrationConfetti() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    const defaults = {
      colors: CONFETTI_COLORS,
      disableForReducedMotion: true,
      zIndex: 80,
    };

    const timers: number[] = [];
    const endAt = Date.now() + 4500;

    function fireTopRain() {
      void confetti({
        ...defaults,
        particleCount: 28,
        spread: 120,
        startVelocity: 18,
        gravity: 0.65,
        drift: (Math.random() - 0.5) * 0.8,
        ticks: 320,
        origin: { x: Math.random() * 0.8 + 0.1, y: 0 },
        scalar: 1.05 + Math.random() * 0.25,
        shapes: ["square", "circle"],
      });
    }

    // Opening curtain cascade
    void confetti({
      ...defaults,
      particleCount: 140,
      spread: 120,
      startVelocity: 32,
      gravity: 0.7,
      ticks: 340,
      origin: { x: 0.5, y: 0 },
      scalar: 1.15,
    });

    void confetti({
      ...defaults,
      particleCount: 70,
      angle: 55,
      spread: 70,
      startVelocity: 42,
      gravity: 0.75,
      ticks: 320,
      origin: { x: 0, y: 0.12 },
    });

    void confetti({
      ...defaults,
      particleCount: 70,
      angle: 125,
      spread: 70,
      startVelocity: 42,
      gravity: 0.75,
      ticks: 320,
      origin: { x: 1, y: 0.12 },
    });

    // Continuous top rain for ~4.5s
    const rainInterval = window.setInterval(() => {
      if (Date.now() > endAt) {
        window.clearInterval(rainInterval);
        return;
      }
      fireTopRain();
      fireTopRain();
    }, 220);
    timers.push(rainInterval);

    // Mid celebration gold burst
    timers.push(
      window.setTimeout(() => {
        void confetti({
          ...defaults,
          colors: GOLD_COLORS,
          particleCount: 100,
          spread: 90,
          startVelocity: 28,
          gravity: 0.7,
          ticks: 300,
          origin: { x: 0.5, y: 0.08 },
          shapes: ["square", "circle"],
        });
      }, 900)
    );

    // Side gilt showers
    timers.push(
      window.setTimeout(() => {
        void confetti({
          ...defaults,
          colors: GOLD_COLORS,
          particleCount: 60,
          angle: 65,
          spread: 60,
          startVelocity: 38,
          ticks: 280,
          origin: { x: 0, y: 0.2 },
        });
        void confetti({
          ...defaults,
          colors: GOLD_COLORS,
          particleCount: 60,
          angle: 115,
          spread: 60,
          startVelocity: 38,
          ticks: 280,
          origin: { x: 1, y: 0.2 },
        });
      }, 1800)
    );

    // Final plentiful gold finish (~4s in)
    timers.push(
      window.setTimeout(() => {
        void confetti({
          ...defaults,
          colors: GOLD_COLORS,
          particleCount: 120,
          spread: 110,
          startVelocity: 26,
          gravity: 0.7,
          ticks: 340,
          origin: { x: 0.5, y: 0 },
          scalar: 1.2,
        });
        void confetti({
          ...defaults,
          particleCount: 80,
          spread: 100,
          startVelocity: 24,
          gravity: 0.65,
          ticks: 320,
          origin: { x: 0.3, y: 0 },
        });
        void confetti({
          ...defaults,
          particleCount: 80,
          spread: 100,
          startVelocity: 24,
          gravity: 0.65,
          ticks: 320,
          origin: { x: 0.7, y: 0 },
        });
      }, 3200)
    );

    return () => {
      for (const id of timers) window.clearTimeout(id);
      window.clearInterval(rainInterval);
      confetti.reset();
    };
  }, []);

  return null;
}
