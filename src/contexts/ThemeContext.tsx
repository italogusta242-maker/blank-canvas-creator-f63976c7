import React, { createContext, useContext, useEffect } from "react";

type Theme = "light" | "textured" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = React.useState<Theme>("textured"); // Change default to textured to break the white layer

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };
  
  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "textured" : "light"));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-theme", theme);
    
    if (theme === "textured") {
      root.classList.add("textured-bg");
    } else {
      root.classList.remove("textured-bg");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

