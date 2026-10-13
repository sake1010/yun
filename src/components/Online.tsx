import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { nameColorIndex } from '../rules/color';
import { CloseIcon, UsersIcon } from './Icons';

interface OnlineProps {
  /** 線上的所有代號,自己應排在最前面 */
  names: string[];
  me: string | null;
}

function Person({ name, isMe }: { name: string; isMe: boolean }) {
  const { t } = useTranslation();
  return (
    <li className="person">
      <span className="person__dot" aria-hidden="true" />
      <span className={`person__name c-${nameColorIndex(name)}`}>{name}</span>
      {isMe && <span className="person__you">{t('chat.you')}</span>}
    </li>
  );
}

/** 把自己排在最前面 */
export function orderOnline(names: string[], me: string | null): string[] {
  if (!me) return names;
  const rest = names.filter((n) => n !== me);
  return names.includes(me) ? [me, ...rest] : rest;
}

/** 電腦版:固定在右側的線上名單 */
export function OnlineSidebar({ names, me }: OnlineProps) {
  const { t } = useTranslation();
  return (
    <aside className="side" aria-label={t('chat.onlineList')}>
      <div className="side__head">
        <UsersIcon size={22} />
        {t('chat.online', { count: names.length })}
      </div>
      <ul className="side__list">
        {names.map((n) => (
          <Person key={n} name={n} isMe={n === me} />
        ))}
      </ul>
    </aside>
  );
}

/** 手機版:頂欄左邊的「線上 N 人」摘要,點一下展開 */
export function OnlineSummary({ names, me, expanded, onToggle }: OnlineProps & { expanded: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const preview = names.map((n) => (n === me ? `${n}${t('chat.you')}` : n)).join('、');
  return (
    <button
      type="button"
      className="summary"
      aria-expanded={expanded}
      aria-label={expanded ? t('chat.collapseOnline') : t('chat.expandOnline')}
      onClick={onToggle}
    >
      <UsersIcon size={22} />
      <span className="summary__text">
        <span className="summary__count">{t('chat.online', { count: names.length })}</span>
        <span className="summary__names">{preview}</span>
      </span>
    </button>
  );
}

/** 手機版:展開後蓋在訊息區上的名單卡片 */
export function OnlinePanel({ names, me, onClose }: OnlineProps & { onClose: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="scrim" aria-hidden="true" onClick={onClose} />
      <div className="panel" role="dialog" aria-label={t('chat.onlineList')}>
        <div className="panel__head">
          <div className="panel__title">{t('chat.online', { count: names.length })}</div>
          <button type="button" className="icon-btn icon-btn--bare" aria-label={t('chat.closeOnline')} onClick={onClose}>
            <CloseIcon size={22} />
          </button>
        </div>
        <ul className="panel__list">
          {names.map((n) => (
            <Person key={n} name={n} isMe={n === me} />
          ))}
        </ul>
      </div>
    </>
  );
}
