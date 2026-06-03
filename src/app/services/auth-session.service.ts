import { Injectable } from '@angular/core';

import { AuthResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuthSessionService {
  private readonly storageKey = 'auth_session';

  getSession(): AuthResponse | null {
    const storedSession = localStorage.getItem(this.storageKey);

    if (!storedSession) {
      return null;
    }

    try {
      return JSON.parse(storedSession) as AuthResponse;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  setSession(session: AuthResponse): void {
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  clearSession(): void {
    localStorage.removeItem(this.storageKey);
  }

  getAuthorizationHeader(): string | null {
    const session = this.getSession();

    if (!session?.token) {
      return null;
    }

    const tokenType = session.tokenType?.trim() || 'Bearer';
    return `${tokenType} ${session.token}`;
  }
}
