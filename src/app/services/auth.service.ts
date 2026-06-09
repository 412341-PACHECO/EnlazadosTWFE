import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  RefreshTokenRequest,
  ResendVerificationEmailRequest,
  ResetPasswordRequest,
} from '../models';
import { AuthSessionService } from './auth-session.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly authUrl = `${environment.apiBaseUrl}/api/auth`;

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.authUrl}/login`, payload)
      .pipe(tap((response) => this.authSessionService.setSession(response)));
  }

  refreshToken(payload: RefreshTokenRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.authUrl}/refresh`, payload)
      .pipe(tap((response) => this.authSessionService.setSession(response)));
  }

  verifyEmail(token: string): Observable<MessageResponse> {
    return this.http.get<MessageResponse>(`${this.authUrl}/verify-email`, {
      params: { token },
    });
  }

  resendVerificationEmail(payload: ResendVerificationEmailRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.authUrl}/resend-verification`, payload);
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.authUrl}/forgot-password`, payload);
  }

  resetPassword(payload: ResetPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.authUrl}/reset-password`, payload);
  }

  me(): Observable<string> {
    return this.http.get(`${this.authUrl}/me`, { responseType: 'text' });
  }

  getSession(): AuthResponse | null {
    return this.authSessionService.getSession();
  }

  logout(): void {
    this.authSessionService.clearSession();
  }
}
