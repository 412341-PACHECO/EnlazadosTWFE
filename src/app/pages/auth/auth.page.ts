import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  briefcaseOutline,
  closeOutline,
  eyeOffOutline,
  eyeOutline,
  heart,
  lockClosedOutline,
  mailOutline,
  personCircleOutline,
  personOutline,
} from 'ionicons/icons';

import { RoleBasic } from '../../models';
import { CustomSelectOption } from '../../shared/components/custom-select/custom-select.component';
import { CustomSelectComponent } from '../../shared/components/custom-select/custom-select.component';
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
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IonContent, IonIcon, IonSpinner, CustomSelectComponent],
})
export class AuthPage {
  @ViewChild('termsScrollContainer') private termsScrollContainer?: ElementRef<HTMLDivElement>;

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
  protected isTermsModalOpen = false;
  protected hasReachedTermsBottom = false;

  protected readonly termsSections = [
    {
      title: 'Bienvenida y aceptacion',
      paragraphs: [
        'Bienvenido a EnlazadosTW, una plataforma digital desarrollada por Jonas Pacheco para facilitar el seguimiento interdisciplinario, la coordinacion terapeutica y la comunicacion entre familias, profesionales e instituciones.',
        'Al acceder y utilizar EnlazadosTW, usted expresa su consentimiento, acuerdo y entendimiento de estos Terminos y Condiciones y de la Politica de Privacidad aplicable. Si no esta de acuerdo con estos terminos, no debe utilizar la plataforma.',
        'El uso del servicio implica la aceptacion de las modalidades operativas vigentes y de aquellas que puedan habilitarse en el futuro dentro del alcance funcional de la aplicacion.',
      ],
    },
    {
      title: 'Operaciones habilitadas',
      paragraphs: [
        'EnlazadosTW permite, segun el rol del usuario, registrar cuentas, verificar identidad por correo electronico, cargar perfiles profesionales, registrar pacientes, gestionar equipos terapeuticos, enviar invitaciones, aceptar integraciones, geolocalizar profesionales e instituciones y crear reportes diarios de seguimiento.',
        'Las funcionalidades disponibles podran ampliarse, modificarse o restringirse de acuerdo con la evolucion de la plataforma, necesidades tecnicas, criterios de seguridad o mejoras del servicio.',
      ],
    },
    {
      title: 'Acceso y credenciales',
      paragraphs: [
        'Para operar EnlazadosTW se requiere una cuenta valida y una direccion de correo electronico autentica. El usuario es responsable de mantener la confidencialidad de su contraseña y de cualquier mecanismo adicional de autenticacion.',
        'La clave personal es secreta e intransferible. El usuario asume las consecuencias derivadas de su divulgacion a terceros y libera a EnlazadosTW y a Jonas Pacheco de la responsabilidad por accesos indebidos originados por negligencia en su resguardo.',
        'EnlazadosTW nunca solicitara por correo electronico la contraseña completa ni informacion sensible innecesaria para operar la plataforma.',
      ],
    },
    {
      title: 'Validez operativa',
      paragraphs: [
        'Los registros generados por la plataforma constituiran prueba suficiente de las operaciones realizadas por los usuarios dentro del sistema, incluyendo altas, invitaciones, aceptaciones y reportes interdisciplinarios.',
        'Las notificaciones emitidas por medios digitales dentro de la plataforma o mediante correo electronico tendran la misma validez operativa que una comunicacion escrita, cuando la normativa aplicable lo permita.',
      ],
    },
    {
      title: 'Privacidad y tratamiento de datos',
      paragraphs: [
        'Para utilizar EnlazadosTW, los usuarios deben proporcionar determinados datos personales y profesionales. Esa informacion sera tratada exclusivamente para prestar el servicio, mejorar la experiencia, sostener la seguridad operativa y permitir la coordinacion interdisciplinaria entre los actores autorizados.',
        'Los datos podran almacenarse en infraestructura tecnologica administrada con medidas razonables de seguridad tecnica y organizativa. Cada usuario se compromete a utilizar la informacion a la que acceda unicamente para fines vinculados al seguimiento terapeutico y dentro de su autorizacion funcional.',
      ],
    },
    {
      title: 'Propiedad intelectual',
      paragraphs: [
        'El software, la interfaz, los textos, flujos, diseños y desarrollos de EnlazadosTW se encuentran protegidos por la normativa argentina aplicable en materia de propiedad intelectual, incluyendo la Ley 11.723.',
        'No esta permitida la copia, reproduccion, distribucion, ingenieria inversa o explotacion comercial del sistema sin autorizacion expresa del desarrollador.',
      ],
    },
    {
      title: 'Vigencia y cambios',
      paragraphs: [
        'El usuario puede dejar de utilizar el servicio en cualquier momento. EnlazadosTW podra suspender o cancelar cuentas que incumplan estos terminos, vulneren la seguridad de la plataforma o hagan un uso indebido de la informacion.',
        'Estos terminos podran actualizarse para reflejar cambios funcionales, legales o de seguridad. La continuidad en el uso de la plataforma luego de una actualizacion implicara la aceptacion de la nueva version vigente.',
      ],
    },
  ];

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
      closeOutline,
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

  protected get visibleRoles(): RoleBasic[] {
    return this.roles.filter((role) => role.name.toUpperCase() !== 'ADMIN');
  }

  protected get roleOptions(): CustomSelectOption<string>[] {
    return [
      { label: 'Selecciona tu rol', value: '' },
      ...this.visibleRoles.map((role) => ({
        label: this.getRoleLabel(role.name),
        value: role.id,
      })),
    ];
  }

  protected getRoleLabel(roleName: string): string {
    const normalizedRole = roleName.toUpperCase();

    if (normalizedRole === 'PROFESSIONAL') {
      return 'Profesional';
    }

    if (normalizedRole === 'PARENT') {
      return 'Familia';
    }

    return roleName;
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

  protected openTermsModal(): void {
    this.isTermsModalOpen = true;
    this.hasReachedTermsBottom = false;
  }

  protected closeTermsModal(): void {
    this.isTermsModalOpen = false;
  }

  protected onTermsScroll(): void {
    const container = this.termsScrollContainer?.nativeElement;

    if (!container) {
      return;
    }

    const scrollBottom = container.scrollTop + container.clientHeight;
    this.hasReachedTermsBottom = scrollBottom >= container.scrollHeight - 8;
  }

  protected acceptTermsFromModal(): void {
    if (!this.hasReachedTermsBottom) {
      return;
    }

    this.registrationForm.controls.acceptTerms.setValue(true);
    this.registrationForm.controls.acceptTerms.markAsTouched();
    this.closeTermsModal();
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
