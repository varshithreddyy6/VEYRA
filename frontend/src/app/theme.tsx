import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light";
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({ theme: "dark", toggleTheme: () => undefined });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("veyra-theme") as Theme) || "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("veyra-theme", theme);
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme((v) => v === "dark" ? "light" : "dark") }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
