import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, star } from 'ionicons/icons';
import { Observable } from 'rxjs';

import { AuthResponse, ParentProfileResponse, ProfessionalProfileResponse } from '../../../../models';
import { ProfessionalProfileService } from '../../../../services/professional-profile.service';
import { UserService } from '../../../../services/user.service';

interface ProfileStat {
  label: string;
  value: string;
}

@Component({
  selector: 'app-home-profile-tab',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './home-profile-tab.component.html',
  styleUrl: './home-profile-tab.component.scss',
})
export class HomeProfileTabComponent implements OnInit {
  @Input() session: AuthResponse | null = null;
  @Output() logoutRequested = new EventEmitter<void>();
  @Output() displayNameResolved = new EventEmitter<string>();

  private readonly userService = inject(UserService);
  private readonly professionalProfileService = inject(ProfessionalProfileService);
  private readonly destroyRef = inject(DestroyRef);

  protected parentProfile: ParentProfileResponse | null = null;
  protected professionalProfile: ProfessionalProfileResponse | null = null;
  protected isLoadingParentProfile = false;
  protected isLoadingProfessionalProfile = false;

  constructor() {
    addIcons({
      logOutOutline,
      star,
    });
  }

  ngOnInit(): void {
    if (!this.session?.email) {
      return;
    }

    if (this.isParentRole) {
      this.loadParentProfile();
      return;
    }

    if (this.isProfessionalRole) {
      this.loadProfessionalProfile();
    }
  }

  protected get stats(): ProfileStat[] {
    if (this.isParentRole) {
      return [
        { label: 'Pacientes', value: String(this.parentProfile?.patients.length ?? 0) },
        { label: 'Activa', value: this.parentProfile?.isActive ? 'Si' : 'No' },
        { label: 'Verificada', value: this.parentProfile?.enabled ? 'Si' : 'No' },
      ];
    }

    if (this.isProfessionalRole) {
      return [
        {
          label: 'Obras sociales',
          value: String(this.professionalProfile?.acceptedHealthInsurances.length ?? 0),
        },
        {
          label: 'Perfil',
          value: this.professionalProfile ? 'Completo' : this.isLoadingProfessionalProfile ? 'Cargando' : 'Pendiente',
        },
        {
          label: 'Honorarios ARS',
          value: this.professionalProfile?.sessionFee
            ? this.formatCurrency(this.professionalProfile.sessionFee)
            : '-',
        },
      ];
    }

    return [
      { label: 'Pacientes', value: '0' },
      { label: 'Sesiones', value: '0' },
      { label: 'Pendientes', value: '0' },
    ];
  }

  protected get isParentRole(): boolean {
    return this.session?.role === 'PARENT';
  }

  protected get isProfessionalRole(): boolean {
    return this.session?.role === 'PROFESSIONAL';
  }

  protected get displayName(): string {
    if (this.parentProfile) {
      return `${this.parentProfile.firstName} ${this.parentProfile.lastName}`.trim();
    }

    if (this.professionalProfile?.user) {
      return `${this.professionalProfile.user.firstName} ${this.professionalProfile.user.lastName}`.trim();
    }

    if (!this.session) {
      return 'Profesional';
    }

    const fullName = `${this.session.firstName ?? ''} ${this.session.lastName ?? ''}`.trim();
    return fullName || this.session.email;
  }

  protected get initials(): string {
    const fullName = this.parentProfile
      ? `${this.parentProfile.firstName} ${this.parentProfile.lastName}`.trim()
      : this.professionalProfile?.user
        ? `${this.professionalProfile.user.firstName} ${this.professionalProfile.user.lastName}`.trim()
        : `${this.session?.firstName ?? ''} ${this.session?.lastName ?? ''}`.trim();

    if (!fullName) {
      return this.session?.email.slice(0, 2).toUpperCase() ?? 'EN';
    }

    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected get roleLabel(): string {
    if (this.parentProfile?.role.name) {
      return this.translateRole(this.parentProfile.role.name);
    }

    if (this.isProfessionalRole) {
      return 'Profesional';
    }

    if (this.isParentRole) {
      return 'Familia';
    }

    return this.session?.role ?? 'Perfil profesional';
  }

  protected get primaryDetailLabel(): string {
    if (this.isParentRole) {
      return 'Pacientes';
    }

    if (this.isProfessionalRole) {
      return 'Especialidad';
    }

    return 'Detalle';
  }

  protected get primaryDetailValue(): string {
    if (this.isParentRole) {
      if (!this.parentProfile?.patients.length) {
        return this.isLoadingParentProfile ? 'Cargando...' : 'Sin pacientes asociados';
      }

      return this.parentProfile.patients
        .map((patient) => `${patient.firstName} ${patient.lastName} (${patient.diagnosis})`)
        .join(', ');
    }

    if (this.isProfessionalRole) {
      return this.professionalProfile?.specialty ?? (this.isLoadingProfessionalProfile ? 'Cargando...' : 'Sin especialidad');
    }

    return '-';
  }

  protected get secondaryDetailLabel(): string {
    if (this.isProfessionalRole) {
      return 'Matricula';
    }

    return 'Correo';
  }

  protected get secondaryDetailValue(): string {
    if (this.isProfessionalRole) {
      return this.professionalProfile?.licenseNumber ?? '-';
    }

    return this.emailLabel;
  }

  protected get tertiaryDetailLabel(): string {
    if (this.isProfessionalRole) {
      return 'Obras sociales';
    }

    return 'Nombre';
  }

  protected get tertiaryDetailValue(): string {
    if (this.isProfessionalRole) {
      if (!this.professionalProfile?.acceptedHealthInsurances.length) {
        return this.isLoadingProfessionalProfile ? 'Cargando...' : 'Sin obras sociales';
      }

      return this.professionalProfile.acceptedHealthInsurances.join(', ');
    }

    return this.firstNameLabel;
  }

  protected get quaternaryDetailLabel(): string {
    if (this.isProfessionalRole) {
      return 'Honorarios ARS';
    }

    return 'Apellido';
  }

  protected get quaternaryDetailValue(): string {
    if (this.isProfessionalRole) {
      return this.professionalProfile?.sessionFee
        ? this.formatCurrency(this.professionalProfile.sessionFee)
        : '-';
    }

    return this.lastNameLabel;
  }

  protected get emailLabel(): string {
    return this.parentProfile?.email ?? this.professionalProfile?.user.email ?? this.session?.email ?? 'Sin correo';
  }

  protected get firstNameLabel(): string {
    return this.parentProfile?.firstName ?? this.professionalProfile?.user.firstName ?? this.session?.firstName ?? '-';
  }

  protected get lastNameLabel(): string {
    return this.parentProfile?.lastName ?? this.professionalProfile?.user.lastName ?? this.session?.lastName ?? '-';
  }

  protected requestLogout(): void {
    this.logoutRequested.emit();
  }

  private loadParentProfile(): void {
    if (!this.session?.email && !this.session?.userId && !this.session?.id) {
      return;
    }

    this.isLoadingParentProfile = true;

    this.resolveParentProfileRequest()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.parentProfile = profile;
          this.isLoadingParentProfile = false;
          this.displayNameResolved.emit(`${profile.firstName} ${profile.lastName}`.trim());
        },
        error: () => {
          this.parentProfile = null;
          this.isLoadingParentProfile = false;
        },
      });
  }

  private loadProfessionalProfile(): void {
    if (!this.session?.email && !this.session?.userId && !this.session?.id) {
      return;
    }

    this.isLoadingProfessionalProfile = true;

    this.resolveProfessionalProfileRequest()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.professionalProfile = profile;
          this.isLoadingProfessionalProfile = false;
          this.displayNameResolved.emit(
            `${profile.user.firstName} ${profile.user.lastName}`.trim(),
          );
        },
        error: () => {
          this.professionalProfile = null;
          this.isLoadingProfessionalProfile = false;
        },
      });
  }

  private resolveParentProfileRequest(): Observable<ParentProfileResponse> {
    const sessionUserId = this.session?.userId ?? this.session?.id;

    if (sessionUserId) {
      return this.userService.getParentProfileById(sessionUserId);
    }

    return this.userService.getParentProfileByEmail(this.session!.email);
  }

  private resolveProfessionalProfileRequest(): Observable<ProfessionalProfileResponse> {
    const sessionUserId = this.session?.userId ?? this.session?.id;

    if (sessionUserId) {
      return this.professionalProfileService.getProfileByUserId(sessionUserId);
    }

    return this.professionalProfileService.getProfileByUserEmail(this.session!.email);
  }

  private translateRole(role: string): string {
    const normalizedRole = role.toUpperCase();

    if (normalizedRole === 'PARENT') {
      return 'Familia';
    }

    if (normalizedRole === 'PROFESSIONAL') {
      return 'Profesional';
    }

    return role;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
