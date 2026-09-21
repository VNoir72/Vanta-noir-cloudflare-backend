"use client";

import { useEffect, useState } from "react";

export function readStorage(key: string): string | null {
  try { return typeof window === "undefined" ? null : window.localStorage.getItem(key); }
  catch { return null; }
}

export function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch { /* Shopping still works when browser storage is unavailable. */ }
}

export function useStoreTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => { setTheme(readStorage("vanta-noir-theme") === "light" ? "light" : "dark"); }, []);
  function toggleTheme() {
    setTheme(current => {
      const next = current === "dark" ? "light" : "dark";
      writeStorage("vanta-noir-theme", next);
      return next;
    });
  }
  return { theme, toggleTheme };
}
