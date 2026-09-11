import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <button type="button" onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
    {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
  </button>;
}
