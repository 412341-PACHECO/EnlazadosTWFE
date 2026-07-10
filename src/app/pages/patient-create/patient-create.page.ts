import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  clipboardOutline,
  heart,
  mailOutline,
  personOutline,
} from 'ionicons/icons';

import { InstitutionResponse } from '../../models';
import {
  CustomSelectComponent,
  CustomSelectOption,
} from '../../shared/components/custom-select/custom-select.component';
import { AuthSessionService } from '../../services/auth-session.service';
import { InstitutionService } from '../../services/institution.service';
import { PatientService } from '../../services/patient.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-patient-create',
  templateUrl: './patient-create.page.html',
  styleUrls: ['./patient-create.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonContent, IonIcon, IonSpinner, CustomSelectComponent],
})
export class PatientCreatePage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly userService = inject(UserService);
  private readonly institutionService = inject(InstitutionService);
  private readonly patientService = inject(PatientService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  protected isSubmitting = false;
  protected isLoadingParent = false;
  protected isLoadingInstitutions = false;
  protected submitError = '';
  protected submitSuccess = '';
  protected institutionsLoadError = '';
  protected institutions: InstitutionResponse[] = [];

  protected readonly patientForm = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    diagnosis: ['', [Validators.maxLength(500)]],
    institutionId: [''],
    parentId: ['', [Validators.required, Validators.pattern(this.uuidPattern)]],
    parentDisplay: this.formBuilder.nonNullable.control({ value: '', disabled: true }),
  });

  constructor() {
    addIcons({
      businessOutline,
      clipboardOutline,
      heart,
      mailOutline,
      personOutline,
    });
  }

  ngOnInit(): void {
    this.loadParentContext();
    this.loadInstitutions();
  }

  protected get institutionOptions(): CustomSelectOption<string>[] {
    return [
      { label: 'Sin escuela asociada', value: '' },
      ...this.institutions
        .filter((institution) => this.isSchoolInstitution(institution))
        .map((institution) => ({
          label: this.formatInstitutionOption(institution),
          value: institution.id,
        })),
    ];
  }

  protected onSubmit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    const { firstName, lastName, diagnosis, institutionId, parentId } =
      this.patientForm.getRawValue();

    this.isSubmitting = true;

    this.patientService
      .createPatient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        diagnosis: diagnosis.trim(),
        institutionId: institutionId.trim() ? institutionId.trim() : null,
        parentId: parentId.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'El paciente fue creado correctamente.';
          void this.router.navigate(['/home']);
        },
        error: (error: unknown) => {
          this.isSubmitting = false;
          this.submitError = this.extractErrorMessage(error);
        },
      });
  }

  protected hasControlError(
    controlName:
      | 'firstName'
      | 'lastName'
      | 'diagnosis'
      | 'institutionId'
      | 'parentId'
      | 'parentDisplay',
  ): boolean {
    const control = this.patientForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected getControlErrorMessage(
    controlName: 'firstName' | 'lastName' | 'diagnosis' | 'institutionId' | 'parentId',
  ): string {
    const control = this.patientForm.get(controlName);

    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (control.errors['pattern']) {
      return 'Ingresa un UUID valido.';
    }

    if (control.errors['minlength']) {
      return `Debe tener al menos ${control.errors['minlength'].requiredLength} caracteres.`;
    }

    if (control.errors['maxlength']) {
      return `Debe tener como maximo ${control.errors['maxlength'].requiredLength} caracteres.`;
    }

    return 'Revisa este campo.';
  }

  protected formatInstitutionOption(institution: InstitutionResponse): string {
    const normalizedType = institution.type.trim();
    return normalizedType ? `${institution.name} - ${normalizedType}` : institution.name;
  }

  private loadParentContext(): void {
    this.submitError = '';

    const session = this.authSessionService.getSession();

    if (!session?.email) {
      this.submitError = 'No se encontro la sesion activa. Inicia sesion nuevamente.';
      void this.router.navigate(['/login']);
      return;
    }

    const sessionUserId = session.userId ?? session.id;

    if (sessionUserId) {
      this.patientForm.patchValue({
        parentId: sessionUserId,
        parentDisplay: this.buildParentLabel(session.firstName, session.lastName, session.email),
      });
      return;
    }

    this.isLoadingParent = true;

    this.userService
      .getUserByEmail(session.email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.isLoadingParent = false;
          this.patientForm.patchValue({
            parentId: user.id,
            parentDisplay: this.buildParentLabel(user.firstName, user.lastName, user.email),
          });
        },
        error: (error: unknown) => {
          this.isLoadingParent = false;
          this.submitError = this.extractParentErrorMessage(error);
        },
      });
  }

  private loadInstitutions(): void {
    this.isLoadingInstitutions = true;
    this.institutionsLoadError = '';

    this.institutionService
      .getAllInstitutions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (institutions) => {
          this.isLoadingInstitutions = false;
          this.institutions = [...institutions].sort((left, right) =>
            left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }),
          );
        },
        error: (error: unknown) => {
          this.isLoadingInstitutions = false;
          this.institutionsLoadError = this.extractInstitutionErrorMessage(error);
        },
      });
  }

  private isSchoolInstitution(institution: InstitutionResponse): boolean {
    const normalizedType = institution.type.toLowerCase();
    const normalizedName = institution.name.toLowerCase();

    return [normalizedType, normalizedName].some((value) =>
      ['escuela', 'colegio', 'jardin', 'jardín', 'instituto'].some((term) =>
        value.includes(term),
      ),
    );
  }

  private buildParentLabel(firstName?: string, lastName?: string, email?: string): string {
    const fullName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');

    if (fullName && email) {
      return `${fullName} (${email})`;
    }

    if (fullName) {
      return fullName;
    }

    return email?.trim() || '';
  }

  private extractParentErrorMessage(error: unknown): string {
    const backendMessage = this.extractMessageFromError(error);

    if (backendMessage) {
      return backendMessage;
    }

    return 'No se pudo recuperar el padre asociado a la sesion. Inicia sesion nuevamente.';
  }

  private extractErrorMessage(error: unknown): string {
    const backendMessage = this.extractMessageFromError(error);

    if (backendMessage) {
      return backendMessage;
    }

    return 'No se pudo crear el paciente. Revisa los datos e intenta nuevamente.';
  }

  private extractInstitutionErrorMessage(error: unknown): string {
    const backendMessage = this.extractMessageFromError(error);

    if (backendMessage) {
      return backendMessage;
    }

    return 'No se pudieron cargar las escuelas disponibles.';
  }

  private extractMessageFromError(error: unknown): string | null {
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

    return null;
  }
}
