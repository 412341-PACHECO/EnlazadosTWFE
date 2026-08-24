import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  checkmarkCircleOutline,
  closeOutline,
  documentAttachOutline,
  downloadOutline,
  eyeOutline,
  folderOpenOutline,
  peopleOutline,
  shareSocialOutline,
} from 'ionicons/icons';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';

import {
  AttendanceBillingResponse,
  AttendanceRecordResponse,
  AttendanceRecordStatus,
  AuthResponse,
  ProfessionalProfileResponse,
  TherapeuticTeamResponse,
  UserResponse,
} from '../../../../models';
import {
  CustomSelectComponent,
  CustomSelectOption,
} from '../../../../shared/components/custom-select/custom-select.component';
import { AttendanceBillingService } from '../../../../services/attendance-billing.service';
import { AttendanceRecordService } from '../../../../services/attendance-record.service';
import { ProfessionalProfileService } from '../../../../services/professional-profile.service';
import { TherapeuticTeamService } from '../../../../services/therapeutic-team.service';
import { UserService } from '../../../../services/user.service';
import {
  formatArsIntegerInput,
  parseArsIntegerInput,
  parseNullableArsIntegerInput,
} from '../../../../shared/utils/currency-input.util';

type DocsSection = 'records' | 'billings';
type SemesterKey = `${number}-H1` | `${number}-H2`;
type MonthlyRevenueChartItem = {
  period: string;
  label: string;
  invoicedAmount: number;
  collectedAmount: number;
  invoicedHeight: number;
  collectedHeight: number;
};

@Component({
  selector: 'app-home-docs-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonIcon,
    CustomSelectComponent,
  ],
  templateUrl: './home-docs-tab.component.html',
  styleUrl: './home-docs-tab.component.scss',
})
export class HomeDocsTabComponent implements OnInit {
  @Input({ required: true }) session: AuthResponse | null = null;

  private readonly attendanceRecordService = inject(AttendanceRecordService);
  private readonly attendanceBillingService = inject(AttendanceBillingService);
  private readonly professionalProfileService = inject(ProfessionalProfileService);
  private readonly therapeuticTeamService = inject(TherapeuticTeamService);
  private readonly userService = inject(UserService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected activeSection: DocsSection = 'records';
  protected professionalProfile: ProfessionalProfileResponse | null = null;
  protected availablePatients: TherapeuticTeamResponse['patient'][] = [];
  protected attendanceRecords: AttendanceRecordResponse[] = [];
  protected attendanceBillings: AttendanceBillingResponse[] = [];
  protected selectedBilling: AttendanceBillingResponse | null = null;
  protected isLoading = true;
  protected loadError = '';
  protected actionError = '';
  protected actionSuccess = '';
  protected isCreatingRecord = false;
  protected isSubmittingRecord = false;
  protected isGeneratingBilling = false;
  protected updatingBillingStatusId: string | null = null;
  protected downloadingBillingId: string | null = null;
  protected sharingBillingId: string | null = null;
  protected selectedMonthFilter = this.getCurrentMonth();
  protected selectedPatientFilter = '';
  protected selectedStatusFilter = '';
  protected selectedSummarySemester = this.getCurrentSemesterKey();
  protected summaryDateFrom = '';
  protected summaryDateTo = '';
  protected summaryFilterError = '';
  protected isLoadingSummaryFilter = false;
  protected summaryFilteredBillings: AttendanceBillingResponse[] | null = null;

  protected readonly recordForm = this.formBuilder.nonNullable.group({
    patientId: ['', [Validators.required]],
    sessionDate: [this.getTodayIso(), [Validators.required]],
    sessionFeeSnapshot: ['', [Validators.required]],
    healthInsuranceName: ['', [Validators.required, Validators.maxLength(150)]],
    healthInsuranceCoverageAmount: [''],
    copaymentAmount: [''],
    notes: ['', [Validators.maxLength(2000)]],
  });

  protected readonly billingForm = this.formBuilder.nonNullable.group({
    billingPeriod: [this.getCurrentMonth(), [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)]],
    patientId: [''],
    healthInsuranceName: ['', [Validators.maxLength(150)]],
  });

  constructor() {
    addIcons({
      cashOutline,
      checkmarkCircleOutline,
      closeOutline,
      documentAttachOutline,
      downloadOutline,
      eyeOutline,
      folderOpenOutline,
      peopleOutline,
      shareSocialOutline,
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  protected onSummarySemesterChange(value: string | null): void {
    if (!value) {
      return;
    }

    this.selectedSummarySemester = value as SemesterKey;
    void this.refreshSummaryBillingRange();
  }

  protected onSummaryDateChange(control: 'from' | 'to', event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    if (control === 'from') {
      this.summaryDateFrom = input.value;
    } else {
      this.summaryDateTo = input.value;
    }

    void this.refreshSummaryBillingRange();
  }

  protected openNativeDatePicker(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    input?.showPicker?.();
  }

  protected onMoneyInput(
    controlName: 'sessionFeeSnapshot' | 'healthInsuranceCoverageAmount' | 'copaymentAmount',
    event: Event,
  ): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    this.recordForm.controls[controlName].setValue(formatArsIntegerInput(input.value));
  }

  protected get isProfessionalRole(): boolean {
    return this.session?.role === 'PROFESSIONAL';
  }

  protected get patientOptions(): CustomSelectOption<string>[] {
    return [
      { label: 'Todos los pacientes', value: '' },
      ...this.availablePatients.map((patient) => ({
        label: `${patient.firstName} ${patient.lastName} · ${patient.diagnosis}`.trim(),
        value: patient.id,
      })),
    ];
  }

  protected get recordPatientOptions(): CustomSelectOption<string>[] {
    return [
      { label: 'Seleccionar paciente', value: '' },
      ...this.availablePatients.map((patient) => ({
        label: `${patient.firstName} ${patient.lastName} · ${patient.diagnosis}`.trim(),
        value: patient.id,
      })),
    ];
  }

  protected get statusOptions(): CustomSelectOption<string>[] {
    return [
      { label: 'Todos los estados', value: '' },
      { label: 'Pendiente', value: 'PENDING' },
      { label: 'Facturada', value: 'BILLED' },
    ];
  }

  protected get semesterOptions(): CustomSelectOption<string>[] {
    const semesterKeys = new Set<SemesterKey>();
    semesterKeys.add(this.getCurrentSemesterKey());

    this.attendanceBillings.forEach((billing) => {
      semesterKeys.add(this.getSemesterKeyFromMonth(billing.billingPeriod));
    });

    this.attendanceRecords.forEach((record) => {
      semesterKeys.add(this.getSemesterKeyFromMonth(record.sessionDate.slice(0, 7)));
    });

    return Array.from(semesterKeys)
      .sort((left, right) => right.localeCompare(left))
      .map((value) => ({
        value,
        label: this.getSemesterLabel(value),
      }));
  }

  protected get semesterBillings(): AttendanceBillingResponse[] {
    const source = this.summaryFilteredBillings ?? this.attendanceBillings;

    return source.filter(
      (billing) => this.getSemesterKeyFromMonth(billing.billingPeriod) === this.selectedSummarySemester,
    );
  }

  protected get semesterRecords(): AttendanceRecordResponse[] {
    return this.attendanceRecords.filter(
      (record) =>
        this.getSemesterKeyFromMonth(record.sessionDate.slice(0, 7)) === this.selectedSummarySemester,
    );
  }

  protected get summaryPeriodLabel(): string {
    return this.getSemesterRangeLabel(this.selectedSummarySemester);
  }

  protected get summaryInvoicedAmount(): string {
    const total = this.semesterBillings.reduce((sum, billing) => sum + billing.totalAmount, 0);
    return this.formatCurrency(total);
  }

  protected get summaryCollectedAmount(): string {
    const total = this.semesterBillings
      .filter((billing) => billing.paymentStatus === 'LIQUIDATED')
      .reduce((sum, billing) => sum + billing.totalAmount, 0);

    return this.formatCurrency(total);
  }

  protected get summaryPendingAmount(): string {
    const total = this.semesterBillings
      .filter((billing) => billing.paymentStatus !== 'LIQUIDATED')
      .reduce((sum, billing) => sum + billing.totalAmount, 0);

    return this.formatCurrency(total);
  }

  protected get summaryBillingCount(): number {
    return this.semesterBillings.length;
  }

  protected get summaryBilledSessions(): number {
    return this.semesterBillings.reduce((sum, billing) => sum + billing.totalSessions, 0);
  }

  protected get summaryPendingSessions(): number {
    return this.semesterRecords.filter((record) => record.status === 'PENDING').length;
  }

  protected get summaryPaidProgress(): number {
    const totalInvoiced = this.semesterBillings.reduce((sum, billing) => sum + billing.totalAmount, 0);

    if (!totalInvoiced) {
      return 0;
    }

    const totalCollected = this.semesterBillings
      .filter((billing) => billing.paymentStatus === 'LIQUIDATED')
      .reduce((sum, billing) => sum + billing.totalAmount, 0);

    return Math.round((totalCollected / totalInvoiced) * 100);
  }

  protected get monthlyRevenueChartData(): MonthlyRevenueChartItem[] {
    const billingPeriods = this.getSemesterBillingPeriods(this.selectedSummarySemester);
    const source = this.summaryFilteredBillings ?? this.attendanceBillings;
    const groupedBillings = new Map<
      string,
      {
        invoicedAmount: number;
        collectedAmount: number;
      }
    >();

    billingPeriods.forEach((period) => {
      groupedBillings.set(period, {
        invoicedAmount: 0,
        collectedAmount: 0,
      });
    });

    source.forEach((billing) => {
      if (!groupedBillings.has(billing.billingPeriod)) {
        return;
      }

      const current = groupedBillings.get(billing.billingPeriod);

      if (!current) {
        return;
      }

      current.invoicedAmount += billing.totalAmount;

      if (billing.paymentStatus === 'LIQUIDATED') {
        current.collectedAmount += billing.totalAmount;
      }
    });

    const maxAmount = Math.max(
      1,
      ...Array.from(groupedBillings.values()).reduce<number[]>(
        (accumulator, item) => accumulator.concat(item.invoicedAmount, item.collectedAmount),
        [],
      ),
    );

    return billingPeriods.map((period) => {
      const item = groupedBillings.get(period) ?? {
        invoicedAmount: 0,
        collectedAmount: 0,
      };

      return {
        period,
        label: this.getShortMonthLabel(period),
        invoicedAmount: item.invoicedAmount,
        collectedAmount: item.collectedAmount,
        invoicedHeight: Math.max(8, Math.round((item.invoicedAmount / maxAmount) * 100)),
        collectedHeight: Math.max(8, Math.round((item.collectedAmount / maxAmount) * 100)),
      };
    });
  }

  protected get visibleRecords(): AttendanceRecordResponse[] {
    return this.attendanceRecords.filter((record) => {
      if (!record.sessionDate.startsWith(this.selectedMonthFilter)) {
        return false;
      }

      if (this.selectedPatientFilter && record.patient.id !== this.selectedPatientFilter) {
        return false;
      }

      if (this.selectedStatusFilter && record.status !== this.selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }

  protected get visibleBillings(): AttendanceBillingResponse[] {
    const selectedPatient = this.billingForm.getRawValue().patientId;
    const selectedHealthInsurance = this.billingForm.getRawValue().healthInsuranceName.trim().toLowerCase();

    return this.attendanceBillings.filter((billing) => {
      if (billing.billingPeriod !== this.billingForm.getRawValue().billingPeriod) {
        return false;
      }

      if (selectedPatient && billing.patient?.id !== selectedPatient) {
        return false;
      }

      if (
        selectedHealthInsurance &&
        !billing.healthInsuranceName?.toLowerCase().includes(selectedHealthInsurance)
      ) {
        return false;
      }

      return true;
    });
  }

  protected get pendingRecordsCount(): number {
    return this.attendanceRecords.filter((record) => record.status === 'PENDING').length;
  }

  protected get billedRecordsCount(): number {
    return this.attendanceRecords.filter((record) => record.status === 'BILLED').length;
  }

  protected get totalPendingAmount(): string {
    const total = this.attendanceRecords
      .filter((record) => record.status === 'PENDING')
      .reduce((sum, record) => sum + record.sessionFeeSnapshot, 0);

    return this.formatCurrency(total);
  }

  protected get canCreateRecords(): boolean {
    return !!this.professionalProfile && this.availablePatients.length > 0;
  }

  protected setSection(section: DocsSection): void {
    this.activeSection = section;
    this.actionError = '';
    this.actionSuccess = '';
  }

  protected openRecordModal(): void {
    this.actionError = '';
    this.actionSuccess = '';
    this.isCreatingRecord = true;

    if (this.availablePatients.length === 1) {
      this.recordForm.patchValue({ patientId: this.availablePatients[0].id });
    }
  }

  protected closeRecordModal(): void {
    this.isCreatingRecord = false;
    this.isSubmittingRecord = false;
    this.recordForm.reset({
      patientId: this.availablePatients.length === 1 ? this.availablePatients[0].id : '',
      sessionDate: this.getTodayIso(),
      sessionFeeSnapshot: '',
      healthInsuranceName: '',
      healthInsuranceCoverageAmount: '',
      copaymentAmount: '',
      notes: '',
    });
  }

  protected submitRecord(): void {
    this.actionError = '';
    this.actionSuccess = '';

    if (!this.professionalProfile) {
      this.actionError = 'No se pudo identificar el perfil profesional actual.';
      return;
    }

    if (this.recordForm.invalid) {
      this.recordForm.markAllAsTouched();
      return;
    }

    const raw = this.recordForm.getRawValue();
    const parsedSessionFee = parseArsIntegerInput(raw.sessionFeeSnapshot);

    if (parsedSessionFee <= 0) {
      this.recordForm.controls.sessionFeeSnapshot.setErrors({ invalidAmount: true });
      this.recordForm.controls.sessionFeeSnapshot.markAsTouched();
      return;
    }

    this.isSubmittingRecord = true;

    this.attendanceRecordService
      .createAttendanceRecord({
        professionalId: this.professionalProfile.id,
        patientId: raw.patientId,
        sessionDate: raw.sessionDate,
        sessionFeeSnapshot: parsedSessionFee,
        healthInsuranceName: raw.healthInsuranceName.trim(),
        healthInsuranceCoverageAmount: this.toNullableNumber(raw.healthInsuranceCoverageAmount),
        copaymentAmount: this.toNullableNumber(raw.copaymentAmount),
        notes: raw.notes.trim() || null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isSubmittingRecord = false;
        }),
      )
      .subscribe({
        next: (record) => {
          this.attendanceRecords = [record, ...this.attendanceRecords].sort((left, right) =>
            right.sessionDate.localeCompare(left.sessionDate),
          );
          this.actionSuccess = 'Asistencia registrada correctamente.';
          this.closeRecordModal();
        },
        error: (error: unknown) => {
          this.actionError = this.extractErrorMessage(error, 'No se pudo registrar la asistencia.');
        },
      });
  }

  protected generateBilling(): void {
    this.actionError = '';
    this.actionSuccess = '';

    if (!this.professionalProfile) {
      this.actionError = 'No se pudo identificar el perfil profesional actual.';
      return;
    }

    if (this.billingForm.invalid) {
      this.billingForm.markAllAsTouched();
      return;
    }

    const raw = this.billingForm.getRawValue();
    this.isGeneratingBilling = true;

    this.attendanceBillingService
      .generateAttendanceBilling({
        professionalId: this.professionalProfile.id,
        billingPeriod: raw.billingPeriod,
        patientId: raw.patientId || null,
        healthInsuranceName: raw.healthInsuranceName.trim() || null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isGeneratingBilling = false;
        }),
      )
      .subscribe({
        next: (billing) => {
          this.attendanceBillings = [billing, ...this.attendanceBillings].sort((left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
          );
          this.selectedBilling = billing;
          this.actionSuccess = 'Liquidación generada correctamente.';
          this.reloadAttendanceRecords();
        },
        error: (error: unknown) => {
          this.actionError = this.extractErrorMessage(error, 'No se pudo generar la liquidación.');
        },
      });
  }

  protected openBillingDetail(billing: AttendanceBillingResponse): void {
    this.selectedBilling = billing;
  }

  protected closeBillingDetail(): void {
    this.selectedBilling = null;
  }

  protected markBillingAsPaid(billing: AttendanceBillingResponse): void {
    this.actionError = '';
    this.actionSuccess = '';
    this.updatingBillingStatusId = billing.id;

    this.attendanceBillingService
      .updateAttendanceBillingStatus(billing.id, { paymentStatus: 'LIQUIDATED' })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.updatingBillingStatusId = null;
        }),
      )
      .subscribe({
        next: (updatedBilling) => {
          this.attendanceBillings = this.attendanceBillings.map((item) =>
            item.id === updatedBilling.id ? updatedBilling : item,
          );
          this.selectedBilling = updatedBilling;
          this.actionSuccess = 'Liquidación marcada como pagada.';
        },
        error: (error: unknown) => {
          this.actionError = this.extractErrorMessage(
            error,
            'No se pudo actualizar el estado de la liquidación.',
          );
        },
      });
  }

  protected deleteRecord(record: AttendanceRecordResponse): void {
    this.actionError = '';
    this.actionSuccess = '';

    this.attendanceRecordService
      .deleteAttendanceRecord(record.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.attendanceRecords = this.attendanceRecords.filter((item) => item.id !== record.id);
          this.actionSuccess = 'Asistencia eliminada correctamente.';
        },
        error: (error: unknown) => {
          this.actionError = this.extractErrorMessage(error, 'No se pudo eliminar la asistencia.');
        },
      });
  }

  protected downloadBillingPdf(billing: AttendanceBillingResponse): void {
    this.downloadingBillingId = billing.id;
    this.actionError = '';

    this.attendanceBillingService
      .downloadAttendanceBillingPdf(billing.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.downloadingBillingId = null;
        }),
      )
      .subscribe({
        next: (blob) => {
          this.saveBlob(blob, this.buildBillingFileName(billing));
        },
        error: (error: unknown) => {
          this.actionError = this.extractErrorMessage(error, 'No se pudo descargar el PDF.');
        },
      });
  }

  protected shareBillingPdf(billing: AttendanceBillingResponse): void {
    this.sharingBillingId = billing.id;
    this.actionError = '';

    this.attendanceBillingService
      .downloadAttendanceBillingPdf(billing.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.sharingBillingId = null;
        }),
      )
      .subscribe({
        next: async (blob) => {
          const fileName = this.buildBillingFileName(billing);
          const file = new File([blob], fileName, { type: 'application/pdf' });

          try {
            if (
              navigator.share &&
              navigator.canShare &&
              navigator.canShare({ files: [file] })
            ) {
              await navigator.share({
                title: fileName,
                files: [file],
              });
              return;
            }

            this.saveBlob(blob, fileName);
          } catch {
            this.saveBlob(blob, fileName);
          }
        },
        error: (error: unknown) => {
          this.actionError = this.extractErrorMessage(error, 'No se pudo compartir el PDF.');
        },
      });
  }

  protected getRecordStatusLabel(status: AttendanceRecordStatus): string {
    return status === 'BILLED' ? 'Facturada' : 'Pendiente';
  }

  protected getBillingStatusLabel(status: AttendanceBillingResponse['paymentStatus']): string {
    if (status === 'AUDIT_SENT') {
      return 'Auditoría enviada';
    }

    if (status === 'APPROVED') {
      return 'Aprobada';
    }

    if (status === 'LIQUIDATED') {
      return 'Liquidada';
    }

    return 'Pendiente';
  }

  protected formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value ?? 0);
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  protected hasRecordControlError(
    controlName:
      | 'patientId'
      | 'sessionDate'
      | 'sessionFeeSnapshot'
      | 'healthInsuranceName',
  ): boolean {
    const control = this.recordForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected getRecordControlErrorMessage(
    controlName:
      | 'patientId'
      | 'sessionDate'
      | 'sessionFeeSnapshot'
      | 'healthInsuranceName',
  ): string {
    const control = this.recordForm.get(controlName);

    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (control.errors['maxlength']) {
      return `Debe tener como maximo ${control.errors['maxlength'].requiredLength} caracteres.`;
    }

    if (control.errors['invalidAmount']) {
      return 'Ingresa un monto mayor a 0.';
    }

    return 'Revisa este campo.';
  }

  protected getDigitalHashPreview(hash: string): string {
    return hash.length > 22 ? `${hash.slice(0, 22)}...` : hash;
  }

  private loadData(): void {
    if (!this.isProfessionalRole) {
      this.isLoading = false;
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

          return this.professionalProfileService.getProfileByUserId(userId).pipe(
            switchMap((profile) =>
              forkJoin({
                profile: of(profile),
                teams: this.therapeuticTeamService
                  .getTherapeuticTeamsByProfessionalId(profile.id)
                  .pipe(catchError(() => of([]))),
                records: this.attendanceRecordService
                  .getAttendanceRecordsByProfessionalId(profile.id)
                  .pipe(catchError(() => of([]))),
                billings: this.attendanceBillingService
                  .getAttendanceBillingsByProfessionalId(profile.id)
                  .pipe(catchError(() => of([]))),
              }),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: ({ profile, teams, records, billings }) => {
          this.professionalProfile = profile;
          this.availablePatients = Array.from(
            new Map(teams.map((team) => [team.patient.id, team.patient])).values(),
          );
          this.attendanceRecords = [...records].sort((left, right) =>
            right.sessionDate.localeCompare(left.sessionDate),
          );
          this.attendanceBillings = [...billings].sort(
            (left, right) =>
              new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
          );

          if (this.availablePatients.length === 1) {
            this.recordForm.patchValue({ patientId: this.availablePatients[0].id });
          }

          if (this.selectedBilling) {
            this.selectedBilling =
              this.attendanceBillings.find((billing) => billing.id === this.selectedBilling?.id) ??
              null;
          }

          void this.refreshSummaryBillingRange();
        },
        error: () => {
          this.loadError = 'No se pudo cargar la información de asistencias y facturación.';
        },
      });
  }

  private reloadAttendanceRecords(): void {
    if (!this.professionalProfile) {
      return;
    }

    this.attendanceRecordService
      .getAttendanceRecordsByProfessionalId(this.professionalProfile.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((records) => {
        this.attendanceRecords = [...records].sort((left, right) =>
          right.sessionDate.localeCompare(left.sessionDate),
        );
      });
  }

  private resolveSessionUserId() {
    const sessionUserId = this.session?.userId ?? this.session?.id;

    if (sessionUserId) {
      return of(sessionUserId);
    }

    if (!this.session?.email) {
      return of<string | null>(null);
    }

    return this.userService.getUserByEmail(this.session.email).pipe(
      map((user: UserResponse) => user.id),
      catchError(() => of<string | null>(null)),
    );
  }

  private toNullableNumber(value: string): number | null {
    return parseNullableArsIntegerInput(value);
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  private buildBillingFileName(billing: AttendanceBillingResponse): string {
    return `liquidacion-${billing.billingPeriod}-${billing.id}.pdf`;
  }

  private getCurrentSemesterKey(): SemesterKey {
    const today = new Date();
    const month = today.getMonth() + 1;
    const half = month <= 6 ? 'H1' : 'H2';
    return `${today.getFullYear()}-${half}`;
  }

  private getSemesterKeyFromMonth(value: string): SemesterKey {
    const [yearPart, monthPart] = value.split('-');
    const year = Number(yearPart);
    const month = Number(monthPart);
    const half = month >= 1 && month <= 6 ? 'H1' : 'H2';
    return `${year}-${half}`;
  }

  private getSemesterLabel(value: SemesterKey): string {
    const [yearPart, half] = value.split('-');
    return half === 'H1' ? `1° semestre ${yearPart}` : `2° semestre ${yearPart}`;
  }

  private getSemesterRangeLabel(value: SemesterKey): string {
    const [yearPart, half] = value.split('-');
    return half === 'H1' ? `Enero a junio ${yearPart}` : `Julio a diciembre ${yearPart}`;
  }

  private getShortMonthLabel(period: string): string {
    const [yearPart, monthPart] = period.split('-');
    const date = new Date(Number(yearPart), Number(monthPart) - 1, 1);

    return new Intl.DateTimeFormat('es-AR', {
      month: 'short',
    })
      .format(date)
      .replace('.', '');
  }

  private async refreshSummaryBillingRange(): Promise<void> {
    this.summaryFilterError = '';

    if (!this.summaryDateFrom && !this.summaryDateTo) {
      this.summaryFilteredBillings = null;
      return;
    }

    if (this.summaryDateFrom && this.summaryDateTo && this.summaryDateFrom > this.summaryDateTo) {
      this.summaryFilteredBillings = [];
      this.summaryFilterError = 'La fecha desde no puede ser mayor a la fecha hasta.';
      return;
    }

    this.isLoadingSummaryFilter = true;

    const billingPeriods = this.getSemesterBillingPeriods(this.selectedSummarySemester);

    forkJoin(
      billingPeriods.map((billingPeriod) =>
        this.attendanceBillingService
          .getAttendanceBillingsByPeriod(
            billingPeriod,
            this.summaryDateFrom || null,
            this.summaryDateTo || null,
          )
          .pipe(catchError(() => of([]))),
      ),
    )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoadingSummaryFilter = false;
        }),
      )
      .subscribe({
        next: (billingResponses) => {
          const mergedBillings = billingResponses.reduce<AttendanceBillingResponse[]>(
            (accumulator, current) => accumulator.concat(current),
            [],
          );

          this.summaryFilteredBillings = mergedBillings
            .filter(
              (billing: AttendanceBillingResponse, index: number, array: AttendanceBillingResponse[]) =>
                array.findIndex((candidate) => candidate.id === billing.id) === index,
            )
            .sort(
              (left: AttendanceBillingResponse, right: AttendanceBillingResponse) =>
                new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
            );
        },
        error: () => {
          this.summaryFilteredBillings = [];
          this.summaryFilterError = 'No se pudo aplicar el filtro por rango de fechas.';
        },
      });
  }

  private getSemesterBillingPeriods(semester: SemesterKey): string[] {
    const [yearPart, half] = semester.split('-');
    const year = Number(yearPart);
    const months = half === 'H1' ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];
    return months.map((month) => `${year}-${String(month).padStart(2, '0')}`);
  }

  private getCurrentMonth(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }

  private getTodayIso(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
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

    return fallback;
  }
}
