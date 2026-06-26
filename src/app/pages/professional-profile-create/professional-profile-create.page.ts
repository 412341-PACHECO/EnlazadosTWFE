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
  private isUpdatingFromMap = false;

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
    sessionFee: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\d+(\.\d{1,2})?$/),
        Validators.min(0.01),
      ],
    ],
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
            sessionFee: Number(formValue.sessionFee),
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
      | 'sessionFee',
  ): boolean {
    const control = this.professionalForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  protected getControlErrorMessage(
    controlName:
      | 'specialty'
      | 'licenseNumber'
      | 'latitude'
      | 'longitude'
      | 'acceptedHealthInsurances'
      | 'sessionFee',
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

    this.marker = L.marker(this.trelewCoordinates, { draggable: true }).addTo(this.map);

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
