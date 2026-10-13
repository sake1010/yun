import { useEffect, useState } from 'react';
import { useService } from '../service/context';

/** 把檔案的儲存位置換成可以顯示、下載的網址。失敗時回傳 'error'。 */
export function useFileUrl(path: string | undefined): string | 'error' | null {
  const service = useService();
  const [state, setState] = useState<{ path: string; url: string | 'error' } | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    service
      .getFileUrl(path)
      .then((url) => {
        if (!cancelled) setState({ path, url });
      })
      .catch(() => {
        if (!cancelled) setState({ path, url: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [service, path]);

  return state && state.path === path ? state.url : null;
}
