import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/store/settings';
import { dark, light, type Colors } from './colors';

export interface Theme {
  scheme: 'light' | 'dark';
  colors: Colors;
}

const ThemeContext = createContext<Theme>({ scheme: 'light', colors: light });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const preference = useSettings((s) => s.theme);
  const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<Theme>(
    () => ({ scheme, colors: scheme === 'dark' ? dark : light }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
