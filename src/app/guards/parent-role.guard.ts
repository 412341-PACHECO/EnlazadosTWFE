import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionService } from '../services/auth-session.service';

export const parentRoleGuard: CanActivateFn = () => {
  const authSessionService = inject(AuthSessionService);
  const router = inject(Router);
  const session = authSessionService.getSession();

  if (!session?.token) {
    return router.createUrlTree(['/login']);
  }

  if (session.role !== 'PARENT') {
    return router.createUrlTree(['/home']);
  }

  return true;
};
