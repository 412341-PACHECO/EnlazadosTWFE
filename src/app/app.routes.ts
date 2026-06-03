import { Routes } from '@angular/router';
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
    path: 'professional-profile/create',
    loadComponent: () =>
      import('./pages/professional-profile-create/professional-profile-create.page').then(
        (m) => m.ProfessionalProfileCreatePage,
      ),
    canActivate: [professionalRoleGuard],
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
