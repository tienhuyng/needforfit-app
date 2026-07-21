import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from '../locales/vi.json';
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import ja from '../locales/ja.json';
import es from '../locales/es.json';

export const SUPPORTED_LANGUAGES = ['vi', 'en', 'zh', 'ja', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const savedLanguage = localStorage.getItem('language') as SupportedLanguage | null;
const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
const defaultLang =
  savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)
    ? savedLanguage
    : SUPPORTED_LANGUAGES.includes(browserLang)
      ? browserLang
      : 'vi';

void i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
    zh: { translation: zh },
    ja: { translation: ja },
    es: { translation: es },
  },
  lng: defaultLang,
  fallbackLng: 'vi',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  interpolation: { escapeValue: false },
});

export default i18n;

export function changeLanguage(lang: SupportedLanguage): void {
  localStorage.setItem('language', lang);
  void i18n.changeLanguage(lang);
}
