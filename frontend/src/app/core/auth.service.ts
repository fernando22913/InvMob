import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import type { LoginRequest, TokenResponse, User } from '../models';

export const TOKEN_STORAGE_KEY = 'token';
export const EMAIL_STORAGE_KEY = 'user_email';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSubject = new BehaviorSubject<User | null>(null);
  private readonly tokenSubject = new BehaviorSubject<string | null>(
    this.readToken()
  );

  readonly user$: Observable<User | null> = this.userSubject.asObservable();
  readonly token$: Observable<string | null> =
    this.tokenSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    this.hydrateUser(this.tokenSubject.value);
  }

  login(credentials: LoginRequest): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          localStorage.setItem(EMAIL_STORAGE_KEY, credentials.email);
          this.setSession(response.access_token);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(EMAIL_STORAGE_KEY);
    this.tokenSubject.next(null);
    this.userSubject.next(null);
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  isAuthenticated(): boolean {
    return this.tokenSubject.value !== null;
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  private setSession(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    this.tokenSubject.next(token);
    this.hydrateUser(token);
  }

  private readToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private readEmail(): string {
    try {
      return localStorage.getItem(EMAIL_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  }

  /**
   * The backend exposes no `/auth/me`; like the original React context we derive
   * the user id from the JWT `sub` claim and keep a lightweight user object.
   */
  private hydrateUser(token: string | null): void {
    if (!token) {
      this.userSubject.next(null);
      return;
    }
    try {
      const payloadPart = token.split('.')[1];
      // JWT uses base64url; atob expects standard base64.
      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64)) as { sub?: string };
      this.userSubject.next({
        id: Number(payload.sub),
        email: this.readEmail(),
        full_name: '',
        is_active: true,
        created_at: '',
        updated_at: '',
      });
    } catch {
      this.logout();
    }
  }
}
