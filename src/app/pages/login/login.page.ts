import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  eyeOffOutline,
  eyeOutline,
  heart,
  lockClosedOutline,
  mailOutline,
} from 'ionicons/icons';

import { AuthResponse, UserResponse } from '../../models';
import { AuthService } from '../../services/auth.service';
import { PatientService } from '../../services/patient.service';
import { ProfessionalProfileService } from '../../services/professional-profile.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IonContent, IonIcon, IonSpinner],
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly patientService = inject(PatientService);
  private readonly professionalProfileService = inject(ProfessionalProfileService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected isSubmitting = false;
  protected showPassword = false;
  protected submitError = '';

  protected readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    addIcons({
      eyeOffOutline,
      eyeOutline,
      heart,
      lockClosedOutline,
      mailOutline,
    });
  }

  protected onSubmit(): void {
    this.submitError = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    this.authService
      .login(this.loginForm.getRawValue())
      .pipe(switchMap((response) => this.resolvePostLoginRoute(response)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (route) => {
          this.isSubmitting = false;
          void this.router.navigate([route]);
        },
        error: (error: unknown) => {
          this.isSubmitting = false;
          this.submitError = this.extractErrorMessage(error);
        },
      });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  protected hasControlError(controlName: 'email' | 'password'): boolean {
    const control = this.loginForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected getControlErrorMessage(controlName: 'email' | 'password'): string {
    const control = this.loginForm.get(controlName);

    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (control.errors['email']) {
      return 'Ingresa un correo electronico valido.';
    }

    if (control.errors['minlength']) {
      return `Debe tener al menos ${control.errors['minlength'].requiredLength} caracteres.`;
    }

    return 'Revisa este campo.';
  }

  private extractErrorMessage(error: unknown): string {
    const fallbackMessage = 'No se pudo iniciar sesion. Verifica tus credenciales.';

    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof error.error === 'object' &&
      error.error !== null &&
      'message' in error.error &&
      typeof error.error.message === 'string'
    ) {
      return error.error.message;
    }

    return fallbackMessage;
  }

  private resolvePostLoginRoute(response: AuthResponse): Observable<string> {
    if (!response.role?.trim()) {
      return of('/auth');
    }

    return this.resolveSessionUserId(response).pipe(
      switchMap((userId) => {
        if (!userId) {
          return of('/home');
        }

        if (response.role === 'PARENT') {
          return this.patientService.getPatientsByParentId(userId).pipe(
            switchMap((patients) => of(patients.length > 0 ? '/home' : '/patient/create')),
          );
        }

        if (response.role === 'PROFESSIONAL') {
          return this.professionalProfileService.getProfileByUserId(userId).pipe(
            switchMap(() => of('/home')),
            catchError((error: unknown) => {
              if (this.isMissingProfessionalProfileError(error)) {
                return of('/professional-profile/create');
              }

              throw error;
            }),
          );
        }

        return of('/home');
      }),
    );
  }

  private resolveSessionUserId(response: AuthResponse): Observable<string | null> {
    const sessionUserId = response.userId;

    if (sessionUserId) {
      return of(sessionUserId);
    }

    if (!response.email) {
      return of(null);
    }

    return this.userService
      .getUserByEmail(response.email)
      .pipe(switchMap((user: UserResponse) => of(user.id)));
  }

  private isNotFoundError(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 404;
  }

  private isMissingProfessionalProfileError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }

    const requestUrl = error.url ?? '';

    if (!requestUrl.includes('/api/professional-profiles/user/')) {
      return false;
    }

    if (error.status === 404) {
      return true;
    }

    if (error.status === 400) {
      const message =
        typeof error.error === 'object' &&
        error.error !== null &&
        'message' in error.error &&
        typeof error.error.message === 'string'
          ? error.error.message.toLowerCase()
          : '';

      return !message || message.includes('perfil profesional');
    }

    return false;
  }
}
