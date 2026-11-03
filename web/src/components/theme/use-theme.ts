"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "dark");
}

export function setTheme(theme: Theme) {
  if (theme === "light") {
    document.documentElement.dataset.theme = "light";
  } else {
    delete document.documentElement.dataset.theme;
  }
  try {
    localStorage.setItem("dank-theme", theme);
  } catch {
    // Private mode: theme still applies for this visit.
  }
}

/**
 * Like useTheme, but null until the client knows the real theme (server render
 * and hydration). For third-party embeds that must mount once with the final theme.
 */
export function useResolvedTheme(): Theme | null {
  return useSyncExternalStore<Theme | null>(subscribe, getTheme, () => null);
}
