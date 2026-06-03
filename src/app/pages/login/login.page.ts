import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eyeOffOutline,
  eyeOutline,
  heart,
  lockClosedOutline,
  mailOutline,
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';

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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          void this.router.navigate([this.getRouteByRole(response.role)]);
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

  private getRouteByRole(role: string): string {
    if (role === 'PROFESSIONAL') {
      return '/professional-profile/create';
    }

    return '/home';
  }
}
