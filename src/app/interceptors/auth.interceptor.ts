import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthSessionService } from '../services/auth-session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authSessionService = inject(AuthSessionService);
  const requestUrl = request.url;
  const requestMethod = request.method;

  const logResponse = (stream: ReturnType<typeof next>) =>
    stream.pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            console.log('[HTTP OK]', requestMethod, requestUrl, event.status);
          }
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse) {
            console.error('[HTTP ERROR]', requestMethod, requestUrl, error.status, error.message);
            return;
          }

          console.error('[HTTP ERROR]', requestMethod, requestUrl, error);
        },
      }),
    );

  console.log('[HTTP REQUEST]', requestMethod, requestUrl, 'apiBaseUrl=', environment.apiBaseUrl);

  if (request.url.includes('/api/auth/login') || request.url.includes('/api/auth/refresh')) {
    return logResponse(next(request));
  }

  const authorizationHeader = authSessionService.getAuthorizationHeader();

  if (!authorizationHeader) {
    return logResponse(next(request));
  }

  return logResponse(
    next(
      request.clone({
        setHeaders: {
          Authorization: authorizationHeader,
        },
      }),
    ),
  );
};
