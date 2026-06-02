import { Injectable, signal, computed, effect, Injector, runInInjectionContext, inject } from '@angular/core';

const STORAGE_KEY = 'localpaste:theme';
export type Theme = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private injector = inject(Injector);
  private readonly _theme = signal<Theme>(this.readStoredTheme());
  readonly theme = this._theme.asReadonly();
  readonly isDark = computed(() => this.resolve(this._theme()) === 'dark');

  initialize(): void {
    this.apply(this._theme());
    runInInjectionContext(this.injector, () => {
      effect(() => this.apply(this._theme()));
    });
    if (typeof window !== 'undefined' && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this._theme() === 'system') this.apply('system');
      });
    }
  }

  setTheme(theme: Theme): void {
    this._theme.set(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  private resolve(theme: Theme): 'light' | 'dark' {
    if (theme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return theme;
  }

  private apply(theme: Theme): void {
    if (typeof document === 'undefined') return;
    const resolved = this.resolve(theme);
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  }

  private readStoredTheme(): Theme {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
      /* ignore */
    }
    return 'system';
  }
}
