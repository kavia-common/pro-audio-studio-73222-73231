import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'light', setTheme: () => {} });

/**
 * PUBLIC_INTERFACE
 * useTheme provides current theme and setter for components.
 */
export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * PUBLIC_INTERFACE
 * ThemeProvider applies data-theme to documentElement and persists preference.
 */
export function ThemeProvider({ children, initialTheme = 'light' }) {
  const [theme, setTheme] = useState(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null;
    return saved || initialTheme;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { window.localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
