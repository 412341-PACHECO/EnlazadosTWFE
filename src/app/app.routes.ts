import { Routes } from '@angular/router';
import { parentRoleGuard } from './guards/parent-role.guard';
import { professionalRoleGuard } from './guards/professional-role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./pages/auth/auth.page').then((m) => m.AuthPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/verify-email/verify-email.page').then((m) => m.VerifyEmailPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'professional-profile/create',
    loadComponent: () =>
      import('./pages/professional-profile-create/professional-profile-create.page').then(
        (m) => m.ProfessionalProfileCreatePage,
      ),
    canActivate: [professionalRoleGuard],
  },
  {
    path: 'patient/create',
    loadComponent: () =>
      import('./pages/patient-create/patient-create.page').then((m) => m.PatientCreatePage),
    canActivate: [parentRoleGuard],
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
];
