import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();
  private nextId = 1;

  success(message: string, ttl = 3000): void {
    this.push({ kind: 'success', message }, ttl);
  }
  error(message: string, ttl = 4500): void {
    this.push({ kind: 'error', message }, ttl);
  }
  info(message: string, ttl = 3000): void {
    this.push({ kind: 'info', message }, ttl);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(t: Omit<Toast, 'id'>, ttl: number): void {
    const id = this.nextId++;
    this._toasts.update((list) => [...list, { ...t, id }]);
    if (ttl > 0) {
      setTimeout(() => this.dismiss(id), ttl);
    }
  }
}
