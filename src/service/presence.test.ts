import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PresenceGrace } from './presence';

describe('PresenceGrace', () => {
  const joined: string[] = [];
  const left: string[] = [];
  let grace: PresenceGrace;

  beforeEach(() => {
    vi.useFakeTimers();
    joined.length = 0;
    left.length = 0;
    grace = new PresenceGrace(30_000, (n) => joined.push(n), (n) => left.push(n));
  });
  afterEach(() => {
    grace.dispose();
    vi.useRealTimers();
  });

  it('第一次同步時已在線的人,不發「進來了」', () => {
    grace.sync(['a', 'b']);
    expect(joined).toEqual([]);
  });

  it('之後新出現的人發「進來了」', () => {
    grace.sync(['a']);
    grace.sync(['a', 'b']);
    expect(joined).toEqual(['b']);
  });

  it('離開超過緩衝時間才發「離開了」', () => {
    grace.sync(['a', 'b']);
    grace.sync(['a']);
    vi.advanceTimersByTime(29_999);
    expect(left).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(left).toEqual(['b']);
  });

  it('緩衝時間內回來,什麼提示都不發', () => {
    grace.sync(['a', 'b']);
    grace.sync(['a']);
    vi.advanceTimersByTime(10_000);
    grace.sync(['a', 'b']);
    vi.advanceTimersByTime(60_000);
    expect(joined).toEqual([]);
    expect(left).toEqual([]);
  });

  it('離開被確認後再回來,會發「進來了」', () => {
    grace.sync(['a', 'b']);
    grace.sync(['a']);
    vi.advanceTimersByTime(30_000);
    grace.sync(['a', 'b']);
    expect(left).toEqual(['b']);
    expect(joined).toEqual(['b']);
  });
});
