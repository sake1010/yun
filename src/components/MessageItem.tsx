import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Message } from '../service/contract';
import type { ChatItem } from '../hooks/useChat';
import { useFileUrl } from '../hooks/useFileUrl';
import { nameColorIndex } from '../rules/color';
import { formatSize, formatTime } from '../rules/format';
import { linkify } from '../rules/linkify';
import { DownloadIcon, FileIcon, ImageIcon } from './Icons';

export interface ImageTarget {
  url: string;
  name: string;
  size: number;
  nickname: string;
  createdAt: string;
}

interface Props {
  item: ChatItem;
  meId: string | undefined;
  onRecall: (id: string) => void;
  onOpenImage: (target: ImageTarget) => void;
}

/** 純文字 + 可點的網址。文字一律當純文字顯示,不會被當成網頁程式碼執行。 */
function TextBody({ text }: { text: string }) {
  return (
    <>
      {linkify(text).map((seg, i) =>
        seg.type === 'link' ? (
          <a key={i} href={seg.value} target="_blank" rel="noopener noreferrer nofollow">
            {seg.value}
          </a>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </>
  );
}

function ImageBody({ message, onOpen }: { message: Message; onOpen: Props['onOpenImage'] }) {
  const { t } = useTranslation();
  const file = message.file!;
  const url = useFileUrl(file.path);
  const ready = url !== null && url !== 'error';
  return (
    <button
      type="button"
      className="image"
      aria-label={t('file.imageOpen')}
      disabled={!ready}
      onClick={() =>
        ready && onOpen({ url, name: file.name, size: file.size, nickname: message.nickname, createdAt: message.createdAt })
      }
    >
      {ready ? (
        <img src={url} alt={t('file.imageAlt', { name: file.name })} />
      ) : (
        <span className="image__placeholder">
          <ImageIcon size={32} strokeWidth={1.8} />
          <span>{url === 'error' ? t('file.unavailable') : t('file.imageHint')}</span>
        </span>
      )}
    </button>
  );
}

function FileBody({ message }: { message: Message }) {
  const { t } = useTranslation();
  const file = message.file!;
  const url = useFileUrl(file.path);
  const ready = url !== null && url !== 'error';
  return (
    <div className="filecard">
      <FileIcon size={28} strokeWidth={1.8} className="filecard__icon" />
      <div className="filecard__info">
        <div className="filecard__name">{file.name}</div>
        <div className="filecard__size">{url === 'error' ? t('file.unavailable') : formatSize(file.size)}</div>
      </div>
      {ready ? (
        <a className="icon-btn" href={url} download={file.name} aria-label={t('file.download', { name: file.name })}>
          <DownloadIcon />
        </a>
      ) : (
        <span className="icon-btn is-disabled" aria-hidden="true">
          <DownloadIcon />
        </span>
      )}
    </div>
  );
}

function MessageItemBase({ item, meId, onRecall, onOpenImage }: Props) {
  const { t, i18n } = useTranslation();

  if (item.type === 'notice') {
    return <div className="notice">{t(item.kind === 'joined' ? 'chat.joined' : 'chat.left', { name: item.nickname })}</div>;
  }

  const m = item.message;
  if (m.recalledAt) {
    return <div className="notice notice--recalled">{t('chat.recalledNotice', { name: m.nickname })}</div>;
  }

  const mine = m.userId === meId;
  const time = <span className="meta__time">{formatTime(m.createdAt, i18n.language)}</span>;
  const name = <span className={`meta__name c-${nameColorIndex(m.nickname)}`}>{m.nickname}</span>;

  return (
    <div className={`msg ${mine ? 'msg--mine' : 'msg--other'}`}>
      <div className="meta">
        {mine ? (
          <>
            {time}
            {name}
          </>
        ) : (
          <>
            {name}
            {time}
          </>
        )}
      </div>
      {m.kind === 'text' && (
        <div className="bubble">
          <TextBody text={m.body ?? ''} />
        </div>
      )}
      {m.kind === 'image' && m.file && <ImageBody message={m} onOpen={onOpenImage} />}
      {m.kind === 'file' && m.file && <FileBody message={m} />}
      {mine && (
        <button type="button" className="recall-link" onClick={() => onRecall(m.id)}>
          {t('chat.recall')}
        </button>
      )}
    </div>
  );
}

export const MessageItem = memo(MessageItemBase);
