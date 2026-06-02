import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  DiffResult,
  Paste,
  PasteAnalytics,
  PasteCreateRequest,
  PasteUpdateRequest,
  PasteWithBody,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class PasteService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/pastes`;

  create(payload: PasteCreateRequest): Observable<Paste> {
    return this.http.post<Paste>(this.base, payload);
  }

  listMine(limit = 50, offset = 0): Observable<Paste[]> {
    return this.http.get<Paste[]>(`${this.base}?limit=${limit}&offset=${offset}`);
  }

  listPublic(limit = 20, offset = 0): Observable<Paste[]> {
    return this.http.get<Paste[]>(`${this.base}/public?limit=${limit}&offset=${offset}`);
  }

  get(id: string): Observable<PasteWithBody> {
    return this.http.get<PasteWithBody>(`${this.base}/${id}`);
  }

  raw(id: string): Observable<string> {
    return this.http.get(`${this.base}/${id}/raw`, { responseType: 'text' });
  }

  update(id: string, payload: PasteUpdateRequest): Observable<Paste> {
    return this.http.patch<Paste>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  fork(id: string): Observable<Paste> {
    return this.http.post<Paste>(`${this.base}/${id}/fork`, {});
  }

  getDiff(id: string): Observable<DiffResult> {
    return this.http.get<DiffResult>(`${this.base}/${id}/diff`);
  }

  getVersions(id: string): Observable<Paste[]> {
    return this.http.get<Paste[]>(`${this.base}/${id}/versions`);
  }

  getAnalytics(id: string): Observable<PasteAnalytics> {
    return this.http.get<PasteAnalytics>(`${this.base}/${id}/analytics`);
  }
}
