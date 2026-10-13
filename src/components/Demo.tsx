import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DemoControls } from '../service/contract';
import type { ChatApi } from '../hooks/useChat';
import { FILE_MAX_MB } from '../rules/limits';
import { CloseIcon } from './Icons';

/**
 * 畫面最上方的細條:提醒目前是示範模式,右邊有開啟示範控制面板的按鈕。
 * 只有階段一的示範模式才有,階段二整個移除。
 */
export function DemoBar({ demo, chat }: { demo: DemoControls; chat: ChatApi }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [bots, setBots] = useState(demo.botsActive);
  const inChat = chat.phase === 'chat';

  return (
    <div className="demobar">
      <span className="demobar__text">{t('app.demoBar')}</span>
      <button type="button" className="demo__toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {t('demo.toggle')}
      </button>
      {open && (
        <section className="demo__panel" aria-label={t('demo.title')}>
          <div className="demo__head">
            <h2 className="demo__title">{t('demo.title')}</h2>
            <span className="demo__badge">{t('demo.badge')}</span>
            <button type="button" className="icon-btn icon-btn--bare" aria-label={t('demo.close')} onClick={() => setOpen(false)}>
              <CloseIcon size={20} />
            </button>
          </div>

          <div className="demo__group">{t('demo.groupConn')}</div>
          <div className="demo__row">
            <button type="button" className="demo__act" disabled={!inChat} onClick={() => demo.simulateDisconnect()}>
              {t('demo.disconnect')}
            </button>
            <button type="button" className="demo__act" disabled={!inChat} onClick={() => demo.simulateReconnect()}>
              {t('demo.reconnect')}
            </button>
          </div>

          <div className="demo__group">{t('demo.groupTrigger')}</div>
          <button type="button" className="demo__act" disabled={!inChat} onClick={() => chat.flash('too-large')}>
            <span>{t('demo.tooLarge')}</span>
            <span className="demo__note">{t('demo.tooLargeNote', { max: FILE_MAX_MB })}</span>
          </button>
          <button type="button" className="demo__act" disabled={inChat} onClick={() => demo.failNextClaim()}>
            {t('demo.taken')}
          </button>
          <button type="button" className="demo__act" disabled={!inChat} onClick={() => demo.failNextSend()}>
            {t('demo.rate')}
          </button>

          <div className="demo__group">{t('demo.groupBots')}</div>
          <div className="demo__switchrow">
            <span>{t('demo.botsSwitch')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={bots}
              aria-label={t('demo.botsSwitch')}
              className={`switch${bots ? ' is-on' : ''}`}
              onClick={() => {
                demo.setBotsActive(!bots);
                setBots(!bots);
              }}
            >
              <span className="switch__knob" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
