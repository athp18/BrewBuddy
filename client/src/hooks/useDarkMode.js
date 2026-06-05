import { useEffect, useState } from 'react';

/**
 * Toggles dark mode within the session. Always starts in light mode.
 */
export const useDarkMode = () => {
  const [dark, setDark] = useState(false);

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
