// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import './i18n';
import i18n from './i18n';
import App from './App';

// jsdom 沒有 <dialog> 的 showModal / close,補上最小替身
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollTo = () => {};
});

beforeEach(async () => {
  localStorage.clear();
  window.history.replaceState({}, '', '/yun/');
  await act(async () => {
    await i18n.changeLanguage('zh-TW');
  });
});

afterEach(() => cleanup());

async function enterChat(name: string) {
  render(<App />);
  const input = await screen.findByLabelText('你的代號');
  fireEvent.change(input, { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: '進入聊天室' }));
  await screen.findByLabelText('訊息內容');
}

describe('階段一的完整流程(假服務)', () => {
  it('第一次進來看到代號頁,空白時不能按進入', async () => {
    render(<App />);
    await screen.findByLabelText('你的代號');
    expect((screen.getByRole('button', { name: '進入聊天室' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('輸入太長的代號會顯示原因', async () => {
    render(<App />);
    const input = await screen.findByLabelText('你的代號');
    fireEvent.change(input, { target: { value: '一二三四五六七八九十甲乙丙' } });
    expect(await screen.findByText('代號最多 12 個字。')).toBeTruthy();
    expect((screen.getByRole('button', { name: '進入聊天室' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('登記代號後進入聊天室,送出訊息、收回', async () => {
    await enterChat('阿森');
    expect(await screen.findByText('還沒有人說話')).toBeTruthy();

    const box = screen.getByLabelText('訊息內容');
    fireEvent.change(box, { target: { value: '大家好 https://example.com/x' } });
    fireEvent.click(screen.getByRole('button', { name: '送出訊息' }));

    const link = await screen.findByRole('link', { name: 'https://example.com/x' });
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('target')).toBe('_blank');

    fireEvent.click(screen.getByRole('button', { name: '收回' }));
    const dialog = await screen.findByRole('dialog', { name: '收回這則訊息？' });
    fireEvent.click(within(dialog).getByRole('button', { name: '收回' }));
    await waitFor(() => expect(screen.getByText('阿森 收回了一則訊息')).toBeTruthy());
    expect(screen.queryByText(/大家好/)).toBeNull();
  });

  it('訊息裡的網頁程式碼只是文字,不會被執行', async () => {
    await enterChat('阿森');
    fireEvent.change(screen.getByLabelText('訊息內容'), { target: { value: '<img src=x onerror=alert(1)>' } });
    fireEvent.click(screen.getByRole('button', { name: '送出訊息' }));
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeTruthy();
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it('重新整理後,已登記的代號直接進入聊天室,收回狀態保留', async () => {
    await enterChat('阿森');
    fireEvent.change(screen.getByLabelText('訊息內容'), { target: { value: '留言' } });
    fireEvent.click(screen.getByRole('button', { name: '送出訊息' }));
    await screen.findByText('留言');
    cleanup();

    render(<App />);
    await screen.findByLabelText('訊息內容');
    expect(await screen.findByText('留言')).toBeTruthy();
  });

  it('語言切換:改成 English 後介面文字變英文', async () => {
    render(<App />);
    await screen.findByLabelText('你的代號');
    fireEvent.click(screen.getByRole('button', { name: '切換介面語言' }));
    fireEvent.click(screen.getByRole('option', { name: 'English' }));
    expect(await screen.findByLabelText('Your nickname')).toBeTruthy();
    expect(localStorage.getItem('chat.lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
