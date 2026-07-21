import i18next from 'i18next';
import vi from '../locales/vi.json';
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import ja from '../locales/ja.json';
import es from '../locales/es.json';

export const SUPPORTED_LANGUAGES = ['vi', 'en', 'zh', 'ja', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'vi';

export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

export function resolveLanguage(header?: string): SupportedLanguage {
  if (!header) return DEFAULT_LANGUAGE;
  const primary = header.split(',')[0]?.split('-')[0]?.toLowerCase();
  if (primary && isSupportedLanguage(primary)) {
    return primary;
  }
  return DEFAULT_LANGUAGE;
}

void i18next.init({
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  resources: {
    vi: { translation: vi },
    en: { translation: en },
    zh: { translation: zh },
    ja: { translation: ja },
    es: { translation: es },
  },
  interpolation: { escapeValue: false },
});

export { i18next };

export function t(key: string, lng: SupportedLanguage = DEFAULT_LANGUAGE): string {
  return i18next.t(key, { lng });
}
