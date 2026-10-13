import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhTW from './zh-TW.json';
import zhCN from './zh-CN.json';
import en from './en.json';
import ko from './ko.json';
import ja from './ja.json';
import { pickFromBrowser, type LanguageCode } from './detect';

export const LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文', htmlLang: 'zh-Hant' },
  { code: 'zh-CN', label: '简体中文', htmlLang: 'zh-Hans' },
  { code: 'en', label: 'English', htmlLang: 'en' },
  { code: 'ko', label: '한국어', htmlLang: 'ko' },
  { code: 'ja', label: '日本語', htmlLang: 'ja' },
] as const;

export type { LanguageCode };

const STORAGE_KEY = 'chat.lang';

function isSupported(code: string | null): code is LanguageCode {
  return LANGUAGES.some((l) => l.code === code);
}

function initialLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isSupported(saved)) return saved;
  } catch {
    // 讀不到就依瀏覽器語言
  }
  return pickFromBrowser(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

function applyHtmlLang(code: string): void {
  const entry = LANGUAGES.find((l) => l.code === code);
  document.documentElement.lang = entry?.htmlLang ?? 'en';
}

/** 使用者手動切換語言,並記住。 */
export function setLanguage(code: LanguageCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // 忽略
  }
  void i18n.changeLanguage(code);
}

void i18n.use(initReactI18next).init({
  lng: initialLanguage(),
  fallbackLng: 'en',
  resources: {
    'zh-TW': { translation: zhTW },
    'zh-CN': { translation: zhCN },
    en: { translation: en },
    ko: { translation: ko },
    ja: { translation: ja },
  },
  interpolation: { escapeValue: false },
});

applyHtmlLang(i18n.language);
i18n.on('languageChanged', applyHtmlLang);

export default i18n;
