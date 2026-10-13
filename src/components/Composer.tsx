import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ConnectionStatus } from '../service/contract';
import type { StatusCode } from '../hooks/useChat';
import { FILE_MAX_MB, TEXT_MAX, TYPING_NAMES_MAX } from '../rules/limits';
import { AlertIcon, ClockIcon, PaperclipIcon, SendIcon } from './Icons';

interface Props {
  connection: ConnectionStatus;
  status: StatusCode | null;
  typingNames: string[];
  onSendText: (text: string) => Promise<boolean>;
  onSendFile: (file: File) => Promise<boolean>;
  onTyping: () => void;
}

/** 輸入框上方那一列:有錯誤提示時顯示提示,否則顯示「正在輸入」。固定高度,避免畫面跳動。 */
function StatusRow({ status, typingNames }: Pick<Props, 'status' | 'typingNames'>) {
  const { t } = useTranslation();

  if (status) {
    const text =
      status === 'rate-limited'
        ? t('composer.rateLimited')
        : status === 'too-large'
          ? t('composer.tooLarge', { max: FILE_MAX_MB })
          : status === 'too-long'
            ? t('composer.tooLong', { max: TEXT_MAX })
            : status === 'offline'
              ? t('composer.offline')
              : status === 'recall-failed'
                ? t('errors.recallFailed')
                : t('composer.failed');
    const Icon = status === 'rate-limited' ? ClockIcon : AlertIcon;
    return (
      <div className="statusrow statusrow--warn" role="status">
        <Icon size={16} strokeWidth={2.2} />
        <span>{text}</span>
      </div>
    );
  }

  if (typingNames.length > 0) {
    const text =
      typingNames.length > TYPING_NAMES_MAX
        ? t('chat.typingMany')
        : t('chat.typing', { names: typingNames.join(t('chat.typingSeparator')) });
    return (
      <div className="statusrow" role="status" aria-live="polite">
        <svg className="typing-dots" width="22" height="8" viewBox="0 0 22 8" aria-hidden="true">
          <circle cx="3" cy="4" r="2.5" fill="currentColor" />
          <circle cx="11" cy="4" r="2.5" fill="currentColor" opacity=".65" />
          <circle cx="19" cy="4" r="2.5" fill="currentColor" opacity=".35" />
        </svg>
        <span>{text}</span>
      </div>
    );
  }

  return <div className="statusrow" aria-hidden="true" />;
}

export function Composer({ connection, status, typingNames, onSendText, onSendFile, onTyping }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const offline = connection !== 'connected';
  const limited = status === 'rate-limited';
  const canSend = text.trim().length > 0 && !sending && !offline && !limited;

  // 輸入框高度隨內容成長,最高約 5 行
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // scrollHeight 不含上下框線(各 1.5px),補上才不會切到文字
    el.style.height = `${Math.min(el.scrollHeight + 3, 128)}px`;
  }, [text]);

  async function send() {
    if (!canSend) return;
    setSending(true);
    const ok = await onSendText(text);
    setSending(false);
    if (ok) {
      setText('');
      areaRef.current?.focus();
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // 電腦版:Enter 送出、Shift+Enter 換行。手機版(觸控裝置):Enter 是換行。
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    e.preventDefault();
    void send();
  }

  async function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || offline || limited) return;
    setSending(true);
    await onSendFile(file);
    setSending(false);
  }

  return (
    <div className="composer">
      <StatusRow status={status} typingNames={typingNames} />
      <div className="composer__bar">
        <input ref={fileRef} type="file" hidden onChange={onPickFile} />
        <button
          type="button"
          className="icon-btn icon-btn--lg"
          aria-label={t('composer.attach')}
          disabled={offline || limited || sending}
          onClick={() => fileRef.current?.click()}
        >
          <PaperclipIcon size={22} />
        </button>
        <label className="sr-only" htmlFor="message-input">
          {t('composer.label')}
        </label>
        <textarea
          id="message-input"
          ref={areaRef}
          className="field field--area"
          rows={1}
          value={text}
          placeholder={t('composer.placeholder')}
          enterKeyHint="send"
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.length > 0) onTyping();
          }}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="send-btn" aria-label={t('composer.send')} disabled={!canSend} onClick={() => void send()}>
          <SendIcon size={22} />
        </button>
      </div>
      <div className="composer__keys">{t('chat.enterKeys')}</div>
    </div>
  );
}
