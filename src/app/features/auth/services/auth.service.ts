import { DestroyRef, inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

import { environment } from '../../../../environments/environment';

import { LoginRequest } from '../models/login-request';
import { LoginResponse } from '../models/login-response';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private expirationTimer?: ReturnType<typeof setTimeout>;

  private readonly apiUrl = `${environment.apiUrl}/api/Auth`;

  private readonly tokenKey = 'cims.accessToken';

  constructor() {
    const checkSession = () => this.scheduleExpiration();
    window.addEventListener('focus', checkSession);
    document.addEventListener('visibilitychange', checkSession);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.expirationTimer);
      window.removeEventListener('focus', checkSession);
      document.removeEventListener('visibilitychange', checkSession);
    });
    this.scheduleExpiration();
  }

  isSessionValid(): boolean {
    const expiration = this.getExpiration();
    return expiration !== null && expiration > Date.now();
  }

  expireSession(): void {
    this.clearSession();
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  private getExpiration(): number | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const { exp } = JSON.parse(atob(payload));
      return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
    } catch {
      return null;
    }
  }

  private scheduleExpiration(): void {
    clearTimeout(this.expirationTimer);
    if (!this.getAccessToken()) return;
    const expiration = this.getExpiration();
    if (expiration === null || expiration <= Date.now()) {
      this.expireSession();
      return;
    }
    this.expirationTimer = setTimeout(
      () => this.scheduleExpiration(),
      Math.min(expiration - Date.now(), 2_147_483_647),
    );
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(this.tokenKey) ?? localStorage.getItem(this.tokenKey);
  }

  saveSession(accessToken: string, rememberMe: boolean): void {
    this.clearSession();
    (rememberMe ? localStorage : sessionStorage).setItem(this.tokenKey, accessToken);
    this.scheduleExpiration();
  }

  clearSession(): void {
    clearTimeout(this.expirationTimer);
    sessionStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.tokenKey);
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials);
  }
}
