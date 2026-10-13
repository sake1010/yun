/**
 * 進出提示的緩衝邏輯(docs/architecture.md 7.2、6.3、6.4)。
 *
 * - 第一次同步時已經在線的人,不發「進來了」。
 * - 有人從名單消失後,先等 graceMs;期間他又回來,就什麼提示都不發。
 * - 等滿 graceMs 還沒回來,才發「離開了」。
 *
 * 這是純邏輯,不依賴任何網路,階段一的假服務與階段二的 Supabase 服務共用。
 */
export class PresenceGrace {
  private known = new Set<string>();
  private current = new Set<string>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private initialized = false;

  constructor(
    private readonly graceMs: number,
    private readonly onJoined: (name: string) => void,
    private readonly onLeft: (name: string) => void,
  ) {}

  /** 傳入「現在線上的所有人」。 */
  sync(names: Iterable<string>): void {
    this.current = new Set(names);

    if (!this.initialized) {
      this.initialized = true;
      this.known = new Set(this.current);
      return;
    }

    for (const name of this.current) {
      const pending = this.timers.get(name);
      if (pending !== undefined) {
        clearTimeout(pending);
        this.timers.delete(name);
      }
      if (!this.known.has(name)) {
        this.known.add(name);
        this.onJoined(name);
      }
    }

    for (const name of this.known) {
      if (this.current.has(name) || this.timers.has(name)) continue;
      this.timers.set(
        name,
        setTimeout(() => {
          this.timers.delete(name);
          if (this.current.has(name)) return;
          this.known.delete(name);
          this.onLeft(name);
        }, this.graceMs),
      );
    }
  }

  dispose(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }
}
