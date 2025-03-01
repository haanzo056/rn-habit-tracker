export const light = {
  background: '#F7F7F5',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEFEC',
  text: '#1B1B1A',
  textMuted: '#6B6B66',
  border: '#E2E2DE',
  primary: '#3B5BDB',
  onPrimary: '#FFFFFF',
  danger: '#C2255C',
  success: '#2F9E44',
};

export type Colors = typeof light;

export const dark: Colors = {
  background: '#111113',
  surface: '#1C1C1F',
  surfaceAlt: '#26262A',
  text: '#EDEDEF',
  textMuted: '#9A9AA2',
  border: '#2E2E33',
  primary: '#748FFC',
  onPrimary: '#0B0B0C',
  danger: '#F06595',
  success: '#51CF66',
};

export const habitColors = [
  '#E8590C',
  '#F59F00',
  '#37B24D',
  '#1098AD',
  '#4263EB',
  '#7048E8',
  '#D6336C',
  '#868E96',
] as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 16, full: 999 } as const;
