import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { debounceTime, switchMap } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  heart,
  locationOutline,
  medkitOutline,
  ribbonOutline,
} from 'ionicons/icons';
import * as L from 'leaflet';

import { AuthSessionService } from '../../services/auth-session.service';
import { ProfessionalProfileService } from '../../services/professional-profile.service';
import { UserService } from '../../services/user.service';
import { formatArsIntegerInput, parseArsIntegerInput } from '../../shared/utils/currency-input.util';

@Component({
  selector: 'app-professional-profile-create',
  templateUrl: './professional-profile-create.page.html',
  styleUrls: ['./professional-profile-create.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonContent, IonIcon, IonSpinner],
})
export class ProfessionalProfileCreatePage implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  private readonly formBuilder = inject(FormBuilder);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly userService = inject(UserService);
  private readonly professionalProfileService = inject(ProfessionalProfileService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly trelewCoordinates: [number, number] = [-43.24895, -65.30505];

  private map?: L.Map;
  private marker?: L.Marker;
  private coverageCircle?: L.Circle;
  private isUpdatingFromMap = false;
  private readonly minCoverageRadiusKm = 0.5;
  private readonly maxCoverageRadiusKm = 15;

  protected isSubmitting = false;
  protected submitError = '';
  protected submitSuccess = '';

  protected readonly professionalForm = this.formBuilder.nonNullable.group({
    specialty: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    licenseNumber: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(50)]],
    latitude: [
      '',
      [
        Validators.required,
        Validators.pattern(/^-?\d+(\.\d+)?$/),
        Validators.min(-90),
        Validators.max(90),
      ],
    ],
    longitude: [
      '',
      [
        Validators.required,
        Validators.pattern(/^-?\d+(\.\d+)?$/),
        Validators.min(-180),
        Validators.max(180),
      ],
    ],
    acceptedHealthInsurances: ['', [Validators.maxLength(300)]],
    sessionFee: ['', [Validators.required]],
    coverageRadiusKm: [''],
  });

  constructor() {
    addIcons({
      cashOutline,
      heart,
      locationOutline,
      medkitOutline,
      ribbonOutline,
    });

    this.professionalForm.patchValue(
      {
        latitude: `${this.trelewCoordinates[0]}`,
        longitude: `${this.trelewCoordinates[1]}`,
      },
      { emitEvent: false },
    );

    this.professionalForm.controls.latitude.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncMarkerFromForm());

    this.professionalForm.controls.longitude.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncMarkerFromForm());

    this.professionalForm.controls.specialty.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.handleSpecialtyChange(value));

    this.professionalForm.controls.coverageRadiusKm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncCoverageCircle());
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  protected onSubmit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (this.professionalForm.invalid) {
      this.professionalForm.markAllAsTouched();
      return;
    }

    const session = this.authSessionService.getSession();

    if (!session?.email) {
      this.submitError = 'No se encontro la sesion activa. Inicia sesion nuevamente.';
      void this.router.navigate(['/login']);
      return;
    }

    const formValue = this.professionalForm.getRawValue();
    const parsedSessionFee = parseArsIntegerInput(formValue.sessionFee);

    if (parsedSessionFee <= 0) {
      this.professionalForm.controls.sessionFee.setErrors({ invalidAmount: true });
      this.professionalForm.controls.sessionFee.markAsTouched();
      return;
    }

    this.isSubmitting = true;

    this.userService
      .getUserByEmail(session.email)
      .pipe(
        switchMap((user) =>
          this.professionalProfileService.createProfessionalProfile({
            userId: user.id,
            specialty: formValue.specialty.trim(),
            licenseNumber: formValue.licenseNumber.trim(),
            latitude: Number(formValue.latitude),
            longitude: Number(formValue.longitude),
            acceptedHealthInsurances: this.parseHealthInsurances(
              formValue.acceptedHealthInsurances,
            ),
            sessionFee: parsedSessionFee,
            coverageRadiusKm: this.requiresCoverageRadius
              ? Number(formValue.coverageRadiusKm)
              : null,
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitSuccess = 'El perfil profesional fue creado correctamente.';
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
      | 'specialty'
      | 'licenseNumber'
      | 'latitude'
      | 'longitude'
      | 'acceptedHealthInsurances'
      | 'sessionFee'
      | 'coverageRadiusKm',
  ): boolean {
    const control = this.professionalForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected onSessionFeeInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    const formattedValue = formatArsIntegerInput(input.value);
    this.professionalForm.controls.sessionFee.setValue(formattedValue);
  }

  protected getControlErrorMessage(
    controlName:
      | 'specialty'
      | 'licenseNumber'
      | 'latitude'
      | 'longitude'
      | 'acceptedHealthInsurances'
      | 'sessionFee'
      | 'coverageRadiusKm',
  ): string {
    const control = this.professionalForm.get(controlName);

    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio.';
    }

    if (control.errors['pattern']) {
      return 'Ingresa un valor numerico valido.';
    }

    if (control.errors['invalidAmount']) {
      return 'Ingresa un monto mayor a 0.';
    }

    if (control.errors['minlength']) {
      return `Debe tener al menos ${control.errors['minlength'].requiredLength} caracteres.`;
    }

    if (control.errors['maxlength']) {
      return `Debe tener como maximo ${control.errors['maxlength'].requiredLength} caracteres.`;
    }

    if (control.errors['min']) {
      return `El valor minimo permitido es ${control.errors['min'].min}.`;
    }

    if (control.errors['max']) {
      return `El valor maximo permitido es ${control.errors['max'].max}.`;
    }

    return 'Revisa este campo.';
  }

  protected get requiresCoverageRadius(): boolean {
    return this.isTherapeuticCompanionSpecialty(this.professionalForm.controls.specialty.value);
  }

  protected get coverageRadiusLabel(): string {
    const rawValue = this.professionalForm.controls.coverageRadiusKm.value;
    const radius = Number(rawValue);
    return Number.isFinite(radius) ? `${radius.toFixed(1)} km` : `${this.minCoverageRadiusKm.toFixed(1)} km`;
  }

  protected get coverageMinLabel(): string {
    return `${this.minCoverageRadiusKm.toFixed(1)} km`;
  }

  protected get coverageMaxLabel(): string {
    return `${this.maxCoverageRadiusKm} km`;
  }

  private initializeMap(): void {
    if (!this.mapContainer || this.map) {
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      center: this.trelewCoordinates,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.marker = L.marker(this.trelewCoordinates, {
      draggable: true,
      icon: this.createProfessionalMarkerIcon(),
    }).addTo(this.map);

    this.coverageCircle = L.circle(this.trelewCoordinates, {
      radius: this.minCoverageRadiusKm * 1000,
      color: '#47bfdc',
      fillColor: '#72d8ee',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '8 8',
    });

    this.marker.on('dragend', () => {
      const markerPosition = this.marker?.getLatLng();

      if (!markerPosition) {
        return;
      }

      this.updateFormCoordinates(markerPosition.lat, markerPosition.lng);
    });

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.updateMapPosition(event.latlng.lat, event.latlng.lng);
      this.updateFormCoordinates(event.latlng.lat, event.latlng.lng);
    });

    queueMicrotask(() => this.map?.invalidateSize());
    this.handleSpecialtyChange(this.professionalForm.controls.specialty.value);
  }

  private syncMarkerFromForm(): void {
    if (this.isUpdatingFromMap) {
      return;
    }

    const latitude = Number(this.professionalForm.controls.latitude.value);
    const longitude = Number(this.professionalForm.controls.longitude.value);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    this.updateMapPosition(latitude, longitude);
  }

  private updateMapPosition(latitude: number, longitude: number): void {
    if (!this.marker || !this.map) {
      return;
    }

    this.marker.setLatLng([latitude, longitude]);
    this.coverageCircle?.setLatLng([latitude, longitude]);
    this.map.panTo([latitude, longitude], { animate: true });
  }

  private updateFormCoordinates(latitude: number, longitude: number): void {
    this.isUpdatingFromMap = true;

    this.professionalForm.patchValue(
      {
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
      },
      { emitEvent: false },
    );

    this.professionalForm.controls.latitude.markAsDirty();
    this.professionalForm.controls.longitude.markAsDirty();
    this.professionalForm.controls.latitude.updateValueAndValidity({ emitEvent: false });
    this.professionalForm.controls.longitude.updateValueAndValidity({ emitEvent: false });

    this.isUpdatingFromMap = false;
  }

  private parseHealthInsurances(rawValue: string): string[] {
    return rawValue
      .split(',')
      .map((insurance) => insurance.trim())
      .filter(Boolean);
  }

  private handleSpecialtyChange(value: string): void {
    const coverageControl = this.professionalForm.controls.coverageRadiusKm;

    if (this.isTherapeuticCompanionSpecialty(value)) {
      coverageControl.setValidators([
        Validators.required,
        Validators.pattern(/^\d+(\.\d{1,1})?$/),
        Validators.min(this.minCoverageRadiusKm),
        Validators.max(this.maxCoverageRadiusKm),
      ]);

      if (!coverageControl.value.trim()) {
        coverageControl.setValue(`${this.minCoverageRadiusKm.toFixed(1)}`, { emitEvent: false });
      }
    } else {
      coverageControl.clearValidators();
      coverageControl.setValue('', { emitEvent: false });
      this.coverageCircle?.remove();
    }

    coverageControl.updateValueAndValidity({ emitEvent: false });
    this.syncCoverageCircle();
  }

  private syncCoverageCircle(): void {
    if (!this.map || !this.coverageCircle) {
      return;
    }

    if (!this.requiresCoverageRadius) {
      return;
    }

    const radiusKm = Number(this.professionalForm.controls.coverageRadiusKm.value);
    const latitude = Number(this.professionalForm.controls.latitude.value);
    const longitude = Number(this.professionalForm.controls.longitude.value);

    if (!Number.isFinite(radiusKm) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    this.coverageCircle.setLatLng([latitude, longitude]);
    this.coverageCircle.setRadius(radiusKm * 1000);

    if (!this.map.hasLayer(this.coverageCircle)) {
      this.coverageCircle.addTo(this.map);
    }
  }

  private isTherapeuticCompanionSpecialty(value: string): boolean {
    const normalized = this.normalizeSpecialty(value);
    return normalized === 'at' || normalized.includes('acompanante terapeutico');
  }

  private normalizeSpecialty(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/\s+/g, ' ');
  }

  private createProfessionalMarkerIcon(): L.DivIcon {
    return L.divIcon({
      className: 'professional-marker-shell',
      html: `
        <span class="professional-marker">
          <span class="professional-marker__head"></span>
          <span class="professional-marker__body"></span>
        </span>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
    });
  }

  private extractErrorMessage(error: unknown): string {
    const fallbackMessage =
      'No se pudo crear el perfil profesional. Revisa los datos e intenta nuevamente.';

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
