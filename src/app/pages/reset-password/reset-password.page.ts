import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  eyeOffOutline,
  eyeOutline,
  heart,
  lockClosedOutline,
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';

const passwordMatchValidator: ValidatorFn = (control) => {
  const password = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IonContent, IonIcon, IonSpinner],
})
export class ResetPasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected token = '';
  protected isSubmitting = false;
  protected isLoadingToken = true;
  protected showPassword = false;
  protected showConfirmPassword = false;
  protected submitError = '';
  protected submitSuccess = '';

  protected readonly resetPasswordForm = this.formBuilder.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordMatchValidator] },
  );

  constructor() {
    addIcons({
      arrowBackOutline,
      eyeOffOutline,
      eyeOutline,
      heart,
      lockClosedOutline,
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.token = params.get('token') ?? '';
      this.isLoadingToken = false;

      if (!this.token) {
        this.submitError = 'El enlace de recuperacion no es valido o esta incompleto.';
      }
    });
  }

  protected onSubmit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (!this.token) {
      this.submitError = 'El enlace de recuperacion no es valido o esta incompleto.';
      return;
    }

    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    this.authService
      .resetPassword({
        token: this.token,
        newPassword: this.resetPasswordForm.getRawValue().newPassword,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.submitSuccess = response.message;
          this.resetPasswordForm.reset({
            newPassword: '',
            confirmPassword: '',
          });
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

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  protected hasControlError(controlName: 'newPassword' | 'confirmPassword'): boolean {
    const control = this.resetPasswordForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected hasFormError(errorKey: string): boolean {
    return (
      !!this.resetPasswordForm.errors?.[errorKey] &&
      (this.resetPasswordForm.dirty || this.resetPasswordForm.touched)
    );
  }

  protected getControlErrorMessage(controlName: 'newPassword' | 'confirmPassword'): string {
    const control = this.resetPasswordForm.get(controlName);

    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (control.errors['minlength']) {
      return `Debe tener al menos ${control.errors['minlength'].requiredLength} caracteres.`;
    }

    return 'Revisa este campo.';
  }

  private extractErrorMessage(error: unknown): string {
    const fallbackMessage = 'No se pudo actualizar la contrasena. Intenta nuevamente.';

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
}
