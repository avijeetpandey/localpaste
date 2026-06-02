import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WebhookConfig, WebhookCreate } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class WebhookService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/webhooks`;

  list(): Observable<WebhookConfig[]> { return this.http.get<WebhookConfig[]>(this.base); }
  create(payload: WebhookCreate): Observable<WebhookConfig> { return this.http.post<WebhookConfig>(this.base, payload); }
  update(id: string, payload: Partial<WebhookCreate & { is_active: boolean }>): Observable<WebhookConfig> { return this.http.put<WebhookConfig>(`${this.base}/${id}`, payload); }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
  test(id: string): Observable<{ message: string }> { return this.http.post<{ message: string }>(`${this.base}/${id}/test`, {}); }
}
