import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('govexam_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } catch {
      return 'light';
    }
  });

  const syncThemeDOM = (currentTheme) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', currentTheme);
    if (currentTheme === 'dark') {
      root.classList.add('dark');
      if (document.body) document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      if (document.body) document.body.classList.remove('dark');
    }
    try {
      localStorage.setItem('govexam_theme', currentTheme);
    } catch (e) {}
  };

  useEffect(() => {
    syncThemeDOM(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      syncThemeDOM(nextTheme);
      return nextTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

