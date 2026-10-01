import { useEffect, useState } from 'react';

const STORAGE_KEY = 'elsa-theme';

export type Theme = 'light' | 'dark';

const listeners = new Set<() => void>();

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'dark' || value === 'light') return value;
  } catch {
    /* private mode */
  }
  return null;
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readTheme(): Theme {
  return storedTheme() ?? systemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

let theme: Theme = typeof document === 'undefined' ? 'light' : readTheme();
if (typeof document !== 'undefined') applyTheme(theme);

function emit() {
  for (const listener of listeners) listener();
}

export function getTheme(): Theme {
  return theme;
}

export function setTheme(next: Theme) {
  theme = next;
  applyTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
  emit();
}

export function toggleTheme() {
  setTheme(theme === 'dark' ? 'light' : 'dark');
}

export function useTheme() {
  const [value, setValue] = useState(theme);

  useEffect(() => {
    const listen = () => setValue(theme);
    listeners.add(listen);
    setValue(theme);
    return () => {
      listeners.delete(listen);
    };
  }, []);

  return { theme: value, setTheme, toggleTheme };
}
