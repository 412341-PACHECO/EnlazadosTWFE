import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkCircleOutline,
  heart,
  mailOutline,
  refreshOutline,
  warningOutline,
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.page.html',
  styleUrls: ['./verify-email.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IonContent, IonIcon, IonSpinner],
})
export class VerifyEmailPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected verificationStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  protected verificationMessage = 'Estamos esperando el token de verificacion.';
  protected isResending = false;
  protected resendError = '';
  protected resendSuccess = '';

  protected readonly resendForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    addIcons({
      arrowBackOutline,
      checkmarkCircleOutline,
      heart,
      mailOutline,
      refreshOutline,
      warningOutline,
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const token = params.get('token');
      const email = params.get('email') ?? '';

      this.resendForm.patchValue({ email }, { emitEvent: false });

      if (!token) {
        this.verificationStatus = 'idle';
        this.verificationMessage =
          'Ingresa tu correo para reenviar el enlace de verificacion.';
        return;
      }

      this.verifyToken(token);
    });
  }

  protected onResend(): void {
    this.resendError = '';
    this.resendSuccess = '';

    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }

    this.isResending = true;

    this.authService
      .resendVerificationEmail(this.resendForm.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isResending = false;
          this.resendSuccess = response.message;
        },
        error: (error: unknown) => {
          this.isResending = false;
          this.resendError = this.extractErrorMessage(error);
        },
      });
  }

  protected hasControlError(): boolean {
    const control = this.resendForm.get('email');
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected getControlErrorMessage(): string {
    const control = this.resendForm.get('email');

    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (control.errors['email']) {
      return 'Ingresa un correo electronico valido.';
    }

    return 'Revisa este campo.';
  }

  private verifyToken(token: string): void {
    this.verificationStatus = 'loading';
    this.verificationMessage = 'Validando tu correo electronico...';
    this.resendError = '';
    this.resendSuccess = '';

    this.authService
      .verifyEmail(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.verificationStatus = 'success';
          this.verificationMessage = response.message;
        },
        error: (error: unknown) => {
          this.verificationStatus = 'error';
          this.verificationMessage = this.extractErrorMessage(error);
        },
      });
  }

  private extractErrorMessage(error: unknown): string {
    const fallbackMessage = 'No se pudo completar la verificacion. Solicita un nuevo enlace.';

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
