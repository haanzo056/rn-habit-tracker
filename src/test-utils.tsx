import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import i18n from '@/i18n';
import { ThemeProvider } from '@/theme/ThemeProvider';

void i18n.changeLanguage('en');

export function renderWithTheme(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: ThemeProvider, ...options });
}

export * from '@testing-library/react-native';
