import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthRequest, RegisterRequest, TokenResponse, User } from '../models/api.models';
import { AuthStore } from './auth.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private store = inject(AuthStore);

  login(payload: AuthRequest): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${environment.apiBaseUrl}/auth/login`, payload)
      .pipe(tap((res) => this.store.setSession(res.access_token, res.user)));
  }

  register(payload: RegisterRequest): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${environment.apiBaseUrl}/auth/register`, payload)
      .pipe(tap((res) => this.store.setSession(res.access_token, res.user)));
  }

  me(): Observable<User> {
    return this.http.get<User>(`${environment.apiBaseUrl}/auth/me`);
  }

  logout(): void {
    this.store.clear();
  }
}
