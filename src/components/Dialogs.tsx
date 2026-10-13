import { useTranslation } from 'react-i18next';
import { formatSize, formatTime } from '../rules/format';
import { nameColorIndex } from '../rules/color';
import { CloseIcon, DownloadIcon } from './Icons';
import { Modal } from './Modal';
import type { ImageTarget } from './MessageItem';

/** 收回確認對話框 */
export function RecallDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onCancel} label={t('recallDialog.title')} className="dialog">
      <div className="dialog__card">
        <h2 className="dialog__title">{t('recallDialog.title')}</h2>
        <p className="dialog__body">{t('recallDialog.body')}</p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--outline" autoFocus onClick={onCancel}>
            {t('recallDialog.cancel')}
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            {t('recallDialog.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** 圖片放大檢視 */
export function ImageViewer({ target, onClose }: { target: ImageTarget | null; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  return (
    <Modal open={target !== null} onClose={onClose} label={t('viewer.label')} className="viewer">
      {target && (
        <div className="viewer__inner">
          <div className="viewer__top">
            <button type="button" className="viewer__close" autoFocus aria-label={t('viewer.close')} onClick={onClose}>
              <CloseIcon size={24} />
            </button>
            <div className="viewer__caption">
              <div className={`viewer__name c-${nameColorIndex(target.nickname)}`}>{target.nickname}</div>
              <div className="viewer__time">{formatTime(target.createdAt, i18n.language)}</div>
            </div>
            <div className="viewer__spacer" />
          </div>
          <div className="viewer__stage" onClick={onClose}>
            <img src={target.url} alt={t('file.imageAlt', { name: target.name })} onClick={(e) => e.stopPropagation()} />
          </div>
          <div className="viewer__bottom">
            <a className="btn btn--primary btn--block" href={target.url} download={target.name}>
              <DownloadIcon size={20} strokeWidth={2.2} />
              {t('viewer.download', { size: formatSize(target.size) })}
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}
