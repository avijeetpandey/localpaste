import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthStore } from './auth.store';

export interface CollabMessage {
  type: string;
  paste_id: string;
  user?: string;
  data?: unknown;
}

@Injectable({ providedIn: 'root' })
export class CollabService {
  private authStore = inject(AuthStore);

  readonly connected = signal(false);
  readonly messages = signal<CollabMessage[]>([]);

  private eventSource: EventSource | null = null;
  private pasteId: string | null = null;

  connect(pasteId: string): void {
    this.disconnect();
    this.pasteId = pasteId;
    const token = this.authStore.token();
    const url = `${environment.apiBaseUrl}/pastes/${pasteId}/collab/stream`;
    // Note: EventSource doesn't support custom headers; token passed via cookie or query param
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.connected.set(true);
    };

    this.eventSource.onmessage = (event) => {
      try {
        const msg: CollabMessage = JSON.parse(event.data);
        this.messages.update((prev) => [...prev.slice(-99), msg]);
      } catch {
        // ignore parse errors
      }
    };

    this.eventSource.onerror = () => {
      this.connected.set(false);
    };
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connected.set(false);
    this.pasteId = null;
  }
}
