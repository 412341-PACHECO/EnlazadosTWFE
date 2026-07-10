import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  chevronDownOutline,
  closeOutline,
  paperPlaneOutline,
  peopleOutline,
  pulseOutline,
  timeOutline,
  trendingUpOutline,
} from 'ionicons/icons';

import {
  AuthResponse,
  DailyReportCreateRequest,
  DailyReportPriority,
  DailyReportResponse,
  PatientResponse,
  ProfessionalProfileResponse,
  TherapeuticTeamInvitationResponse,
  TherapeuticTeamResponse,
  UserResponse,
} from '../../../../models';
import {
  CustomSelectComponent,
  CustomSelectOption,
} from '../../../../shared/components/custom-select/custom-select.component';
import { DailyReportService } from '../../../../services/daily-report.service';
import { PatientService } from '../../../../services/patient.service';
import { ProfessionalProfileService } from '../../../../services/professional-profile.service';
import { TherapeuticTeamInvitationService } from '../../../../services/therapeutic-team-invitation.service';
import { TherapeuticTeamService } from '../../../../services/therapeutic-team.service';
import { UserService } from '../../../../services/user.service';

interface HomeStatsItem {
  label: string;
  value: string;
  icon: string;
}

interface LegajoSummary {
  patient: PatientResponse;
  teams: TherapeuticTeamResponse[];
  reports: DailyReportResponse[];
  invitations: TherapeuticTeamInvitationResponse[];
  activeTeamMembers: ProfessionalProfileResponse[];
  todayReports: DailyReportResponse[];
  previousReports: DailyReportResponse[];
  latestReport: DailyReportResponse | null;
  reportedTodayCount: number;
  pendingCount: number;
  status: 'Activo' | 'En pausa';
}

@Component({
  selector: 'app-home-record-tab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonIcon, CustomSelectComponent],
  templateUrl: './home-record-tab.component.html',
  styleUrl: './home-record-tab.component.scss',
})
export class HomeRecordTabComponent implements OnInit {
  @Input({ required: true }) session: AuthResponse | null = null;

  private readonly patientService = inject(PatientService);
  private readonly professionalProfileService = inject(ProfessionalProfileService);
  private readonly therapeuticTeamService = inject(TherapeuticTeamService);
  private readonly invitationService = inject(TherapeuticTeamInvitationService);
  private readonly dailyReportService = inject(DailyReportService);
  private readonly userService = inject(UserService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filters = ['Todos', 'Activos', 'En Pausa'];
  protected activeFilter = 'Todos';
  protected summaries: LegajoSummary[] = [];
  protected selectedSummary: LegajoSummary | null = null;
  protected expandedSummaryId: string | null = null;
  protected isLoading = true;
  protected loadError = '';
  protected isCreatingInvitation = false;
  protected invitationError = '';
  protected invitationSuccess = '';
  protected isSubmittingInvitation = false;
  protected isCreatingReport = false;
  protected reportError = '';
  protected reportSuccess = '';
  protected isSubmittingReport = false;
  protected selectedPriority: DailyReportPriority = 'LOW';

  protected readonly inviteForm = this.formBuilder.nonNullable.group({
    patientId: ['', [Validators.required]],
    invitedEmail: ['', [Validators.required, Validators.email]],
    startDate: ['', [Validators.required]],
    endDate: [''],
  });

  protected readonly reportForm = this.formBuilder.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(5000)]],
  });

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      chevronDownOutline,
      closeOutline,
      paperPlaneOutline,
      peopleOutline,
      pulseOutline,
      timeOutline,
      trendingUpOutline,
    });
  }

  ngOnInit(): void {
    this.loadLegajoData();
  }

  protected setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  protected get stats(): HomeStatsItem[] {
    const patientCount = this.filteredSummaries.length;
    const todaysReports = this.filteredSummaries.reduce(
      (total, summary) => total + summary.todayReports.length,
      0,
    );
    const pendingReports = this.filteredSummaries.reduce(
      (total, summary) => total + summary.pendingCount,
      0,
    );

    return [
      { label: 'Pacientes', value: String(patientCount), icon: 'people-outline' },
      { label: 'Sesiones hoy', value: String(todaysReports), icon: 'pulse-outline' },
      { label: 'Por completar', value: String(pendingReports), icon: 'trending-up-outline' },
    ];
  }

  protected get filteredSummaries(): LegajoSummary[] {
    if (this.activeFilter === 'Activos') {
      return this.summaries.filter((summary) => summary.status === 'Activo');
    }

    if (this.activeFilter === 'En Pausa') {
      return this.summaries.filter((summary) => summary.status === 'En pausa');
    }

    return this.summaries;
  }

  protected get invitePatientOptions(): CustomSelectOption<string>[] {
    return [
      { label: 'Selecciona un paciente', value: '' },
      ...this.summaries.map((summary) => ({
        label: `${summary.patient.firstName} ${summary.patient.lastName}`.trim(),
        value: summary.patient.id,
      })),
    ];
  }

  protected get isParentRole(): boolean {
    return this.session?.role === 'PARENT';
  }

  protected get isProfessionalRole(): boolean {
    return this.session?.role === 'PROFESSIONAL';
  }

  protected get parentInvitationButtonLabel(): string {
    const referenceSummary = this.selectedSummary;

    if (referenceSummary) {
      return this.hasAssociatedProfessionalsOrPendingInvitations(referenceSummary)
        ? 'Invitar profesional'
        : 'Crear nuevo equipo terapeutico';
    }

    return this.summaries.some((summary) => this.hasAssociatedProfessionalsOrPendingInvitations(summary))
      ? 'Invitar profesional'
      : 'Crear nuevo equipo terapeutico';
  }

  protected get selectedPatientTeamMembers(): ProfessionalProfileResponse[] {
    return this.selectedSummary?.activeTeamMembers ?? [];
  }

  protected get selectedPatientReportsToday(): DailyReportResponse[] {
    return this.selectedSummary?.todayReports ?? [];
  }

  protected get selectedPatientPreviousReports(): DailyReportResponse[] {
    return this.selectedSummary?.previousReports ?? [];
  }

  protected get selectedPatientName(): string {
    if (!this.selectedSummary) {
      return '';
    }

    return `${this.selectedSummary.patient.firstName} ${this.selectedSummary.patient.lastName}`.trim();
  }

  protected getPatientInitials(summary: LegajoSummary): string {
    return `${summary.patient.firstName[0] ?? ''}${summary.patient.lastName[0] ?? ''}`.toUpperCase();
  }

  protected getProfessionalInitials(profile: ProfessionalProfileResponse): string {
    return `${profile.user.firstName[0] ?? ''}${profile.user.lastName[0] ?? ''}`.toUpperCase();
  }

  protected getProfessionalFullName(profile: ProfessionalProfileResponse): string {
    return `${profile.user.firstName} ${profile.user.lastName}`.trim();
  }

  protected getProfessionalReportStatus(profile: ProfessionalProfileResponse): string {
    if (!this.selectedSummary) {
      return 'Pendiente';
    }

    const hasReportToday = this.selectedSummary.todayReports.some(
      (report) => report.author.id === profile.user.id,
    );

    return hasReportToday ? 'Reporto hoy' : 'Pendiente';
  }

  protected getLatestReportAuthor(summary: LegajoSummary): string {
    if (!summary.latestReport) {
      return 'Sin reportes';
    }

    const { firstName, lastName } = summary.latestReport.author;
    return `${firstName} ${lastName}`.trim();
  }

  protected getAuthorSpecialty(report: DailyReportResponse): string {
    const profile = this.selectedSummary?.activeTeamMembers.find(
      (member) => member.user.id === report.author.id,
    );

    return profile?.specialty?.trim() || 'Profesional';
  }

  protected getSummaryDetails(summary: LegajoSummary): string {
    const diagnosis = summary.patient.diagnosis?.trim() || 'Sin diagnostico';
    const institution = summary.patient.institution?.name?.trim();
    return institution ? `${diagnosis} · ${institution}` : diagnosis;
  }

  protected getSelectedPatientDetails(): string {
    if (!this.selectedSummary) {
      return '';
    }

    return this.selectedSummary.patient.diagnosis?.trim() || 'Sin diagnostico';
  }

  protected getSummaryReportBadge(summary: LegajoSummary): string {
    return `${summary.reportedTodayCount}/${summary.activeTeamMembers.length} reportaron`;
  }

  protected getSummaryPreviewText(summary: LegajoSummary): string {
    const content = summary.latestReport?.content?.trim();

    if (!content) {
      return 'Todavia no hay reportes cargados para este equipo.';
    }

    return content.length > 140 ? `${content.slice(0, 140).trim()}...` : content;
  }

  protected getSummaryFooterActionLabel(summary: LegajoSummary): string {
    return summary.previousReports.length > 0 ? 'Ver reportes anteriores' : 'Ver todos los reportes';
  }

  protected getRelativeDateLabel(date: string | null): string {
    if (!date) {
      return 'Sin fecha';
    }

    const target = new Date(date);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startOfTarget = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
    ).getTime();
    const diffDays = Math.round((startOfToday - startOfTarget) / 86400000);

    if (diffDays <= 0) {
      return 'Hoy';
    }

    if (diffDays === 1) {
      return 'Ayer';
    }

    return `Hace ${diffDays} dias`;
  }

  protected getReportTimestamp(date: string): string {
    const target = new Date(date);
    const hours = String(target.getHours()).padStart(2, '0');
    const minutes = String(target.getMinutes()).padStart(2, '0');
    return `${this.getRelativeDateLabel(date)} · ${hours}:${minutes}`;
  }

  protected getSummaryLatestReportMeta(summary: LegajoSummary): string {
    if (!summary.latestReport) {
      return 'Sin reportes cargados';
    }

    const authorSpecialty =
      summary.activeTeamMembers.find((member) => member.user.id === summary.latestReport?.author.id)?.specialty?.trim() ||
      'Profesional';

    return `${this.getReportTimestamp(summary.latestReport.createdAt)} · ${authorSpecialty}`;
  }

  protected isSummaryExpanded(summary: LegajoSummary): boolean {
    return this.expandedSummaryId === summary.patient.id;
  }

  protected toggleSummary(summary: LegajoSummary): void {
    this.expandedSummaryId = this.expandedSummaryId === summary.patient.id ? null : summary.patient.id;
  }

  protected openSummary(summary: LegajoSummary): void {
    this.selectedSummary = summary;
    this.reportError = '';
    this.reportSuccess = '';
  }

  protected closeSummary(): void {
    this.selectedSummary = null;
  }

  public resetToOverview(): void {
    this.selectedSummary = null;
    this.expandedSummaryId = null;
    this.reportError = '';
    this.reportSuccess = '';
  }

  protected openInvitationModal(): void {
    this.invitationError = '';
    this.invitationSuccess = '';
    this.isCreatingInvitation = true;

    if (this.selectedSummary) {
      this.inviteForm.patchValue({ patientId: this.selectedSummary.patient.id });
    } else if (this.summaries.length === 1) {
      this.inviteForm.patchValue({ patientId: this.summaries[0].patient.id });
    }
  }

  protected closeInvitationModal(): void {
    this.isCreatingInvitation = false;
    this.isSubmittingInvitation = false;
    this.inviteForm.reset({
      patientId: this.selectedSummary?.patient.id ?? '',
      invitedEmail: '',
      startDate: '',
      endDate: '',
    });
  }

  protected openReportModal(): void {
    this.reportError = '';
    this.reportSuccess = '';
    this.selectedPriority = 'LOW';
    this.reportForm.reset({ content: '' });
    this.isCreatingReport = true;
  }

  protected closeReportModal(): void {
    this.isCreatingReport = false;
    this.isSubmittingReport = false;
    this.reportForm.reset({ content: '' });
  }

  protected selectPriority(priority: DailyReportPriority): void {
    this.selectedPriority = priority;
  }

  protected isPrioritySelected(priority: DailyReportPriority): boolean {
    return this.selectedPriority === priority;
  }

  protected submitInvitation(): void {
    this.invitationError = '';
    this.invitationSuccess = '';

    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    const { patientId, invitedEmail, startDate, endDate } = this.inviteForm.getRawValue();
    this.isSubmittingInvitation = true;

    this.invitationService
      .createInvitation(patientId, {
        invitedEmail,
        startDate,
        endDate: endDate || null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isSubmittingInvitation = false;
        }),
      )
      .subscribe({
        next: () => {
          this.invitationSuccess = 'Invitacion enviada correctamente.';
          this.loadLegajoData();
          this.closeInvitationModal();
        },
        error: (error: unknown) => {
          this.invitationError = this.extractErrorMessage(error, 'No se pudo enviar la invitacion.');
        },
      });
  }

  protected submitReport(): void {
    this.reportError = '';
    this.reportSuccess = '';

    if (!this.selectedSummary) {
      this.reportError = 'No se pudo identificar el autor o el paciente seleccionado.';
      return;
    }

    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      return;
    }

    this.isSubmittingReport = true;

    this.resolveSessionUserId()
      .pipe(
        switchMap((authorId) => {
          if (!authorId) {
            throw new Error('No session user id');
          }

          const payload: DailyReportCreateRequest = {
            patientId: this.selectedSummary!.patient.id,
            authorId,
            content: this.reportForm.getRawValue().content,
            priority: this.selectedPriority,
            sentimentScore: this.getSentimentScoreByPriority(this.selectedPriority),
          };

          return this.dailyReportService.createDailyReport(payload);
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isSubmittingReport = false;
        }),
      )
      .subscribe({
        next: () => {
          this.reportSuccess = 'Reporte publicado correctamente.';
          this.loadLegajoData(this.selectedSummary?.patient.id);
          this.closeReportModal();
        },
        error: (error: unknown) => {
          this.reportError = this.extractErrorMessage(error, 'No se pudo publicar el reporte.');
        },
      });
  }

  protected hasInviteControlError(controlName: 'patientId' | 'invitedEmail' | 'startDate'): boolean {
    const control = this.inviteForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected getInviteControlErrorMessage(
    controlName: 'patientId' | 'invitedEmail' | 'startDate',
  ): string {
    const control = this.inviteForm.get(controlName);

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

  protected hasReportControlError(): boolean {
    const control = this.reportForm.get('content');
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected getReportControlErrorMessage(): string {
    const control = this.reportForm.get('content');

    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Escribe una observacion para publicar el reporte.';
    }

    if (control.errors['maxlength']) {
      return 'El reporte no puede superar los 5000 caracteres.';
    }

    return 'Revisa este campo.';
  }

  private loadLegajoData(selectedPatientId?: string): void {
    if (!this.session?.role) {
      this.isLoading = false;
      this.loadError = 'No se pudo identificar la sesion actual.';
      return;
    }

    this.isLoading = true;
    this.loadError = '';

    this.resolveSessionUserId()
      .pipe(
        switchMap((userId) => {
          if (!userId) {
            throw new Error('No session user id');
          }

          return this.isParentRole ? this.loadParentLegajo(userId) : this.loadProfessionalLegajo(userId);
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (summaries) => {
          this.summaries = summaries;

          if (!summaries.length) {
            this.selectedSummary = null;
            this.expandedSummaryId = null;
            return;
          }

          if (selectedPatientId) {
            this.selectedSummary =
              summaries.find((summary) => summary.patient.id === selectedPatientId) ?? summaries[0];
            return;
          }

          if (this.selectedSummary) {
            this.selectedSummary =
              summaries.find((summary) => summary.patient.id === this.selectedSummary?.patient.id) ??
              summaries[0];
            return;
          }

          this.selectedSummary = null;
        },
        error: () => {
          this.summaries = [];
          this.selectedSummary = null;
          this.loadError = 'No se pudo cargar el legajo interdisciplinario.';
        },
      });
  }

  private resolveSessionUserId() {
    const sessionUserId = this.session?.userId ?? this.session?.id;

    if (sessionUserId) {
      return of(sessionUserId);
    }

    if (!this.session?.email) {
      return of(null);
    }

    return this.userService.getUserByEmail(this.session.email).pipe(
      map((user: UserResponse) => user.id),
      catchError(() => of(null)),
    );
  }

  private loadParentLegajo(userId: string) {
    return this.patientService.getPatientsByParentId(userId).pipe(
      switchMap((patients) => {
        if (!patients.length) {
          return of([] as LegajoSummary[]);
        }

        return forkJoin(
          patients.map((patient) =>
            forkJoin({
              teams: this.therapeuticTeamService
                .getTherapeuticTeamsByPatientId(patient.id)
                .pipe(catchError(() => of([]))),
              reports: this.dailyReportService
                .getDailyReportsByPatientId(patient.id)
                .pipe(catchError(() => of([]))),
              invitations: this.invitationService
                .getInvitationsByPatient(patient.id)
                .pipe(catchError(() => of([]))),
            }).pipe(
              map(({ teams, reports, invitations }) =>
                this.buildSummary(patient, teams, reports, invitations),
              ),
            ),
          ),
        );
      }),
    );
  }

  private loadProfessionalLegajo(userId: string) {
    return this.professionalProfileService.getProfileByUserId(userId).pipe(
      switchMap((profile) =>
        this.therapeuticTeamService.getTherapeuticTeamsByProfessionalId(profile.id).pipe(
          switchMap((teams) => {
            const uniquePatients = Array.from(
              new Map(teams.map((team) => [team.patient.id, team.patient])).values(),
            );

            if (!uniquePatients.length) {
              return of([] as LegajoSummary[]);
            }

            return forkJoin(
              uniquePatients.map((patient) =>
                forkJoin({
                  teams: this.therapeuticTeamService
                    .getTherapeuticTeamsByPatientId(patient.id)
                    .pipe(catchError(() => of([]))),
                  reports: this.dailyReportService
                    .getDailyReportsByPatientId(patient.id)
                    .pipe(catchError(() => of([]))),
                }).pipe(
                  map(({ teams: patientTeams, reports }) =>
                    this.buildSummary(patient, patientTeams, reports, []),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }

  private buildSummary(
    patient: PatientResponse,
    teams: TherapeuticTeamResponse[],
    reports: DailyReportResponse[],
    invitations: TherapeuticTeamInvitationResponse[],
  ): LegajoSummary {
    const activeTeams = teams.filter((team) => this.isTeamActive(team));
    const activeTeamMembers = Array.from(
      new Map(activeTeams.map((team) => [team.professional.id, team.professional])).values(),
    );
    const todayReports = reports.filter((report) => report.createdAt.startsWith(this.getTodayIso()));
    const previousReports = reports.filter((report) => !report.createdAt.startsWith(this.getTodayIso()));
    const uniqueReportedAuthors = new Set(todayReports.map((report) => report.author.id));
    const latestReport =
      [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ??
      null;
    const pendingCount = Math.max(activeTeamMembers.length - uniqueReportedAuthors.size, 0);

    return {
      patient,
      teams,
      reports: [...reports].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      invitations,
      activeTeamMembers,
      todayReports: [...todayReports].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      previousReports: [...previousReports].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      latestReport,
      reportedTodayCount: uniqueReportedAuthors.size,
      pendingCount,
      status: activeTeamMembers.length ? 'Activo' : 'En pausa',
    };
  }

  private isTeamActive(team: TherapeuticTeamResponse): boolean {
    const today = new Date(this.getTodayIso());
    const startDate = new Date(team.startDate);
    const endDate = team.endDate ? new Date(team.endDate) : null;

    if (startDate > today) {
      return false;
    }

    if (endDate && endDate < today) {
      return false;
    }

    return true;
  }

  private hasAssociatedProfessionalsOrPendingInvitations(summary: LegajoSummary): boolean {
    const hasAssociatedProfessionals = summary.activeTeamMembers.length > 0;
    const hasPendingInvitations = summary.invitations.some(
      (invitation) => invitation.status === 'PENDING',
    );

    return hasAssociatedProfessionals || hasPendingInvitations;
  }

  private getTodayIso(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private getSentimentScoreByPriority(priority: DailyReportPriority): number {
    if (priority === 'LOW') {
      return 1;
    }

    if (priority === 'MEDIUM') {
      return 0;
    }

    return -1;
  }

  private extractErrorMessage(error: unknown, fallbackMessage: string): string {
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
