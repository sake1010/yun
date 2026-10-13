import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, setLanguage, type LanguageCode } from '../i18n';
import { CheckIcon, ChevronDownIcon, GlobeIcon } from './Icons';

/** 語言選單。按鈕上的語言名稱在手機版聊天室會被 CSS 隱藏,只留地球圖示。 */
export function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[2];

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (code: LanguageCode) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <div className="lang" ref={wrapRef}>
      <button
        type="button"
        className="lang__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('lang.label')}
        onClick={() => setOpen((v) => !v)}
      >
        <GlobeIcon />
        <span className="lang__label">{current.label}</span>
        <ChevronDownIcon size={16} className={`lang__chevron${open ? ' is-open' : ''}`} />
      </button>
      {open && (
        <div className="lang__list" role="listbox" aria-label={t('lang.listLabel')}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === current.code}
              lang={l.htmlLang}
              className={`lang__option${l.code === current.code ? ' is-on' : ''}`}
              onClick={() => choose(l.code)}
            >
              <span>{l.label}</span>
              {l.code === current.code && <CheckIcon size={20} className="lang__check" strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
