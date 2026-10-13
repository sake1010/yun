import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatApi } from '../hooks/useChat';
import { NICKNAME_MAX } from '../rules/limits';
import { nicknameLength, validateNickname } from '../rules/validateNickname';
import { AlertIcon, ChatBubbleIcon, WifiOffIcon } from '../components/Icons';
import { LanguageMenu } from '../components/LanguageMenu';

type ServerProblem = 'taken' | 'error' | null;

export function NicknameScreen({ chat }: { chat: ChatApi }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<ServerProblem>(null);

  const check = validateNickname(value);
  const typed = value.length > 0;
  const formatError = typed && !check.ok ? check.reason : null;
  const canSubmit = check.ok && !submitting;
  const failedToStart = chat.phase === 'failed';

  const message = problem === 'taken' ? t('nick.taken') : formatError ? formatMessage(formatError, t) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!check.ok || submitting) return;
    setSubmitting(true);
    setProblem(null);
    const outcome = await chat.claimNickname(check.value);
    // 成功時畫面會直接切到聊天室,不需要再更新這裡的狀態
    if (outcome === 'taken') setProblem('taken');
    else if (outcome === 'error') setProblem('error');
    else if (outcome === 'invalid') setProblem(null);
    if (outcome !== 'ok') setSubmitting(false);
  }

  return (
    <main className="nick">
      <div className="nick__top">
        <LanguageMenu />
      </div>

      <form className="nick__body" onSubmit={onSubmit} noValidate>
        <div className="nick__logo" aria-hidden="true">
          <ChatBubbleIcon size={32} />
        </div>
        <h1 className="nick__title">{t('app.title')}</h1>
        <p className="nick__subtitle">{t('nick.subtitle')}</p>

        <label className="nick__label" htmlFor="nickname">
          {t('nick.label')}
        </label>
        <input
          id="nickname"
          className={`field${message ? ' field--bad' : ''}`}
          type="text"
          value={value}
          placeholder={t('nick.placeholder')}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={message ? true : undefined}
          aria-describedby="nickname-note"
          onChange={(e) => {
            setValue(e.target.value);
            setProblem(null);
          }}
        />
        <div className="nick__note" id="nickname-note">
          {message ? (
            <span className="nick__error" role="alert">
              <AlertIcon size={16} />
              {message}
            </span>
          ) : (
            <span className="nick__hint">{t('nick.hint')}</span>
          )}
          <span className="nick__count">
            {nicknameLength(value)} / {NICKNAME_MAX}
          </span>
        </div>

        <button type="submit" className="btn btn--primary btn--block" disabled={!canSubmit}>
          {submitting ? t('nick.entering') : t('nick.enter')}
        </button>

        {(problem === 'error' || failedToStart) && (
          <div className="conn-card" role="alert">
            <WifiOffIcon size={24} />
            <div className="conn-card__text">
              <div className="conn-card__title">{t('nick.connFailed')}</div>
              <div className="conn-card__hint">{t('nick.connFailedHint')}</div>
            </div>
            <button
              type="button"
              className="btn btn--outline-warn"
              onClick={() => {
                setProblem(null);
                if (failedToStart) chat.retryBoot();
              }}
            >
              {t('nick.retry')}
            </button>
          </div>
        )}
      </form>
    </main>
  );
}

function formatMessage(reason: 'empty' | 'too-long' | 'bad-char', t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (reason === 'too-long') return t('nick.tooLong', { max: NICKNAME_MAX });
  if (reason === 'bad-char') return t('nick.badChar');
  return t('nick.empty');
}
