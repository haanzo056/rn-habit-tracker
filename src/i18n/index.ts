// i18next relies on Intl.PluralRules for Ukrainian plural forms, and Hermes doesn't
// have it on every RN version we care about. The polyfill is a no-op when it exists.
import 'intl-pluralrules';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import uk from './uk';

export type Language = 'en' | 'uk';

export function detectLanguage(): Language {
  return getLocales()[0]?.languageCode === 'uk' ? 'uk' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    uk: { translation: uk },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
