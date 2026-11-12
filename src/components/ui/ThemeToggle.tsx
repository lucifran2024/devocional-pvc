"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

// `discreto` (início, 12/11/2026, 5º ajuste): sem a caixa com borda, que
// pesava mais que os quadros ao lado; a área de toque continua 44 px.
export function ThemeToggle({ discreto = false }: { discreto?: boolean }) {
    const { resolvedTheme, setTheme } = useTheme();

    return (
        <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className={`${discreto ? "rounded-full transition-colors hover:bg-surface-2/60" : "btn-glass rounded-xl"} min-h-11 min-w-11 flex items-center justify-center p-2 relative overflow-hidden group`}
            aria-label={resolvedTheme === "dark" ? "Ativar modo claro" : "Ativar modo noturno"}
            title={resolvedTheme === "dark" ? "Ativar modo claro" : "Ativar modo noturno"}
        >
            <div className="relative z-10">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
                <Moon className="absolute top-0 h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-amber-300" />
            </div>
            <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>
    );
}
