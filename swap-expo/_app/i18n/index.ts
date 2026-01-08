import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import 'intl-pluralrules';

import en from './locales/en.json';
import ht from './locales/ht.json';
import fr from './locales/fr.json';

// Get device language (e.g., "en-US" -> "en")
// Using getLocales() which is the current API in expo-localization
const locales = Localization.getLocales();
const deviceLang = locales[0]?.languageCode || 'en';
const supportedLangs = ['en', 'ht', 'fr'];
const defaultLang = supportedLangs.includes(deviceLang) ? deviceLang : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ht: { translation: ht },
      fr: { translation: fr },
    },
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false, // Disable suspense for React Native
    },
  });

export default i18n;

// Helper to change language programmatically
export const changeLanguage = (lang: string) => {
  if (supportedLangs.includes(lang)) {
    i18n.changeLanguage(lang);
  }
};

// Get current language
export const getCurrentLanguage = () => i18n.language;

// Get all supported languages
export const getSupportedLanguages = () => supportedLangs;
