"use client";

import { useEffect, useState } from "react";

// Use the viewer's device timezone, never the server's UTC clock.
export function useLocalGreeting() {
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const update = () => {
      const hour = new Date().getHours();
      setGreeting(hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 18 ? "Good afternoon" : "Good evening");
    };
    update();
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return greeting;
}
