import { useEffect, useState } from 'react';

/**
 * Persists dark mode preference to localStorage and toggles the `dark` class
 * on <html>. Initialises from localStorage, falling back to the OS preference.
 */
export const useDarkMode = () => {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('brewbuddy-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('brewbuddy-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('brewbuddy-theme', 'light');
    }
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
};
