"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
function subscribeStorage(notify: () => void) {
    window.addEventListener("storage", notify);
    return () => window.removeEventListener("storage", notify);
}
function subscribeSystem(notify: () => void) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
}
type Theme = "dark" | "light" | "system";
type State = { theme: Theme; resolvedTheme: "dark" | "light"; setTheme: (theme: Theme) => void };
const Context = createContext<State | undefined>(undefined);
export function ThemeProvider({ children, defaultTheme = "system", storageKey = "vite-ui-theme" }: {
    children: React.ReactNode; defaultTheme?: Theme; storageKey?: string;
}) {
    const [choice, updateTheme] = useState<Theme | null>(null);
    const saved = useSyncExternalStore(subscribeStorage, () => {
        try { return localStorage.getItem(storageKey); } catch { return null; }
    }, () => null);
    const systemDark = useSyncExternalStore(subscribeSystem, () => window.matchMedia("(prefers-color-scheme: dark)").matches, () => true);
    const theme = choice ?? (saved === "dark" || saved === "light" || saved === "system" ? saved : defaultTheme);
    const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;
    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const apply = () => {
            const next = theme === "system" ? (media.matches ? "dark" : "light") : theme;
            document.documentElement.classList.remove("dark", "light");
            document.documentElement.classList.add(next);

        };
        apply();
        media.addEventListener("change", apply);
        return () => media.removeEventListener("change", apply);
    }, [theme]);
    const setTheme = (next: Theme) => {
        updateTheme(next);
        try { localStorage.setItem(storageKey, next); } catch { /* Still usable without storage. */ }
    };
    return <Context.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</Context.Provider>;
}
export function useTheme() {
    const value = useContext(Context);
    if (!value) throw new Error("useTheme must be used within a ThemeProvider");
    return value;
}
