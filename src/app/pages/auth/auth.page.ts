import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  briefcaseOutline,
  chevronDownOutline,
  eyeOffOutline,
  eyeOutline,
  heart,
  lockClosedOutline,
  mailOutline,
  personCircleOutline,
  personOutline,
} from 'ionicons/icons';

import { RoleBasic } from '../../models';
import { RoleService } from '../../services/role.service';
import { UserService } from '../../services/user.service';

const passwordMatchValidator: ValidatorFn = (control) => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IonContent, IonIcon, IonSpinner],
})
export class AuthPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly roleService = inject(RoleService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected roles: RoleBasic[] = [];
  protected isSubmitting = false;
  protected isLoadingRoles = false;
  protected showPassword = false;
  protected showConfirmPassword = false;
  protected submitError = '';
  protected submitSuccess = '';
  protected roleLoadError = '';

  protected readonly registrationForm = this.formBuilder.nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      roleId: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]],
    },
    { validators: [passwordMatchValidator] },
  );

  constructor() {
    addIcons({
      briefcaseOutline,
      chevronDownOutline,
      eyeOffOutline,
      eyeOutline,
      heart,
      lockClosedOutline,
      mailOutline,
      personCircleOutline,
      personOutline,
    });

    this.loadRoles();
  }

  protected get rolesHelperText(): string {
    if (this.isLoadingRoles) {
      return 'Cargando roles disponibles...';
    }

    if (this.roleLoadError) {
      return this.roleLoadError;
    }

    return 'Selecciona el rol profesional con el que vas a registrarte.';
  }

  protected onSubmit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    const { firstName, lastName, email, roleId, password } =
      this.registrationForm.getRawValue();

    this.isSubmitting = true;

    this.userService
      .createUser({
        firstName,
        lastName,
        email,
        roleId,
        password,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          const registeredEmail = email;
          this.registrationForm.reset({
            firstName: '',
            lastName: '',
            email: '',
            roleId: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false,
          });
          void this.router.navigate(['/verify-email'], {
            queryParams: { email: registeredEmail },
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

  protected hasControlError(
    controlName:
      | 'firstName'
      | 'lastName'
      | 'email'
      | 'roleId'
      | 'password'
      | 'confirmPassword'
      | 'acceptTerms',
  ): boolean {
    const control = this.registrationForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected hasFormError(errorKey: string): boolean {
    return (
      !!this.registrationForm.errors?.[errorKey] &&
      (this.registrationForm.dirty || this.registrationForm.touched)
    );
  }

  protected getControlErrorMessage(
    controlName:
      | 'firstName'
      | 'lastName'
      | 'email'
      | 'roleId'
      | 'password'
      | 'confirmPassword'
      | 'acceptTerms',
  ): string {
    const control = this.registrationForm.get(controlName);

    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (control.errors['requiredTrue']) {
      return 'Debes aceptar los terminos para continuar.';
    }

    if (control.errors['email']) {
      return 'Ingresa un correo electronico valido.';
    }

    if (control.errors['minlength']) {
      return `Debe tener al menos ${control.errors['minlength'].requiredLength} caracteres.`;
    }

    if (control.errors['maxlength']) {
      return `Debe tener como maximo ${control.errors['maxlength'].requiredLength} caracteres.`;
    }

    return 'Revisa este campo.';
  }

  private loadRoles(): void {
    this.isLoadingRoles = true;
    this.roleLoadError = '';

    this.roleService
      .getAllRoles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.roles = roles.map((role) => ({ id: role.id, name: role.name }));
          this.isLoadingRoles = false;
        },
        error: () => {
          this.roles = [];
          this.isLoadingRoles = false;
          this.roleLoadError = 'No se pudieron cargar los roles. Intenta nuevamente mas tarde.';
        },
      });
  }

  private extractErrorMessage(error: unknown): string {
    const fallbackMessage = 'No se pudo crear la cuenta. Revisa los datos e intenta nuevamente.';

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
