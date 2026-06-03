import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthSessionService } from '../services/auth-session.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authSessionService = inject(AuthSessionService);

  if (request.url.includes('/api/auth/login') || request.url.includes('/api/auth/refresh')) {
    return next(request);
  }

  const authorizationHeader = authSessionService.getAuthorizationHeader();

  if (!authorizationHeader) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: authorizationHeader,
      },
    }),
  );
};
