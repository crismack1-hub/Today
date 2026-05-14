import { useEffect } from 'react';
import { usePlannerStore } from '../store/plannerStore';

export function useTheme(): void {
  const theme = usePlannerStore((s) => s.settings.theme);
  const accent = usePlannerStore((s) => s.settings.accent);
  const bgTheme = usePlannerStore((s) => s.settings.bgTheme);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode: 'light' | 'dark') => {
      root.classList.toggle('dark', mode === 'dark');
    };
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      apply(theme);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
    const r = parseInt(accent.slice(1, 3), 16);
    const g = parseInt(accent.slice(3, 5), 16);
    const b = parseInt(accent.slice(5, 7), 16);
    document.documentElement.style.setProperty('--accent-subtle', `rgba(${r}, ${g}, ${b}, 0.14)`);
    document.documentElement.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.07)`);
  }, [accent]);

  useEffect(() => {
    document.documentElement.dataset.bg = bgTheme;
  }, [bgTheme]);
}
