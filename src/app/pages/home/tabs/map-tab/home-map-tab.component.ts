import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  callOutline,
  chatbubbleEllipsesOutline,
  checkmarkCircle,
  closeOutline,
  locateOutline,
  mailOutline,
  paperPlaneOutline,
  schoolOutline,
  searchOutline,
} from 'ionicons/icons';
import * as L from 'leaflet';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

import {
  AuthResponse,
  ContactRequestCreateRequest,
  InstitutionMapResponse,
  PatientResponse,
  ProfessionalProfileMapResponse,
  ProfessionalProfileResponse,
} from '../../../../models';
import {
  CustomSelectComponent,
  CustomSelectOption,
} from '../../../../shared/components/custom-select/custom-select.component';
import { ContactRequestService } from '../../../../services/contact-request.service';
import { InstitutionService } from '../../../../services/institution.service';
import { PatientService } from '../../../../services/patient.service';
import { ProfessionalProfileService } from '../../../../services/professional-profile.service';
import { UserService } from '../../../../services/user.service';

type InstitutionKind = 'school' | 'office' | 'other';

type MapLegendItem = {
  label: string;
  tone: 'professional' | 'school' | 'office' | 'query';
};

interface ProfessionalCardView extends ProfessionalProfileMapResponse {
  acceptedHealthInsurances: string[];
  sessionFee: number;
  fullName: string;
  initials: string;
}

@Component({
  selector: 'app-home-map-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonSpinner, CustomSelectComponent],
  templateUrl: './home-map-tab.component.html',
  styleUrl: './home-map-tab.component.scss',
})
export class HomeMapTabComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) session: AuthResponse | null = null;
  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  private readonly professionalProfileService = inject(ProfessionalProfileService);
  private readonly institutionService = inject(InstitutionService);
  private readonly patientService = inject(PatientService);
  private readonly userService = inject(UserService);
  private readonly contactRequestService = inject(ContactRequestService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly defaultCenter: [number, number] = [-43.24895, -65.30505];
  private readonly defaultRadiusKm = 5;
  private readonly markerRegistry = new Map<string, L.Marker>();

  private map?: L.Map;
  private queryMarker?: L.Marker;
  private professionalsLayer?: L.LayerGroup;
  private institutionsLayer?: L.LayerGroup;
  private coverageLayer?: L.LayerGroup;
  private parentId: string | null = null;
  private parentPatientsLoaded = false;

  protected readonly legendItems: MapLegendItem[] = [
    { label: 'Profesional', tone: 'professional' },
    { label: 'Escuela', tone: 'school' },
    { label: 'Consultorio', tone: 'office' },
    { label: 'Consulta', tone: 'query' },
  ];

  protected selectedSpecialty = '';
  protected selectedHealthInsurance = '';
  protected readonly radiusKm = this.defaultRadiusKm;
  protected showProfessionals = true;
  protected showSchools = true;
  protected showOffices = true;
  protected isLoading = false;
  protected loadError = '';
  protected availableSpecialties: string[] = [];
  protected availableHealthInsurances: string[] = [];
  protected professionals: ProfessionalCardView[] = [];
  protected institutions: InstitutionMapResponse[] = [];
  protected queryLatitude = this.defaultCenter[0];
  protected queryLongitude = this.defaultCenter[1];

  protected parentPatients: PatientResponse[] = [];
  protected isLoadingParentPatients = false;
  protected isContactModalOpen = false;
  protected selectedProfessionalForContact: ProfessionalCardView | null = null;
  protected selectedPatientId = '';
  protected shareContactEmail = true;
  protected shareContactPhone = false;
  protected parentPhone = '';
  protected contactMessage = '';
  protected isSubmittingContactRequest = false;
  protected contactRequestError = '';
  protected actionFeedback = '';
  protected actionFeedbackTone: 'success' | 'error' | null = null;

  constructor() {
    addIcons({
      businessOutline,
      callOutline,
      chatbubbleEllipsesOutline,
      checkmarkCircle,
      closeOutline,
      locateOutline,
      mailOutline,
      paperPlaneOutline,
      schoolOutline,
      searchOutline,
    });
  }

  ngAfterViewInit(): void {
    this.initializeMap();
    this.loadNearbyData();
    this.ensureParentPatientsLoaded();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  protected get canViewProfessionals(): boolean {
    return this.session?.role === 'PARENT';
  }

  protected get visibleProfessionalCount(): number {
    return this.professionals.length;
  }

  protected get hasVisibleProfessionals(): boolean {
    return this.visibleProfessionalCount > 0;
  }

  protected get specialtyOptions(): CustomSelectOption<string>[] {
    return [
      { label: 'Especialidad', value: '' },
      ...this.availableSpecialties.map((specialty) => ({
        label: specialty,
        value: specialty,
      })),
    ];
  }

  protected get healthInsuranceOptions(): CustomSelectOption<string>[] {
    return [
      { label: 'Obra social', value: '' },
      ...this.availableHealthInsurances.map((healthInsurance) => ({
        label: healthInsurance,
        value: healthInsurance,
      })),
    ];
  }

  protected get patientOptions(): CustomSelectOption<string>[] {
    const placeholder = this.parentPatients.length
      ? 'Seleccionar paciente'
      : 'Sin pacientes asociados';

    return [
      { label: placeholder, value: '' },
      ...this.parentPatients.map((patient) => ({
        label: `${patient.firstName} ${patient.lastName} · ${patient.diagnosis}`,
        value: patient.id,
      })),
    ];
  }

  protected onSpecialtyChange(value: string): void {
    this.selectedSpecialty = value;
    this.loadNearbyData();
  }

  protected onHealthInsuranceChange(value: string): void {
    this.selectedHealthInsurance = value;
    this.loadNearbyData();
  }

  protected onToggleLayer(layer: 'professionals' | 'schools' | 'offices'): void {
    if (layer === 'professionals') {
      this.showProfessionals = !this.showProfessionals;
    }

    if (layer === 'schools') {
      this.showSchools = !this.showSchools;
    }

    if (layer === 'offices') {
      this.showOffices = !this.showOffices;
    }

    this.renderMapLayers();
  }

  protected focusProfessional(professional: ProfessionalCardView): void {
    const marker = this.markerRegistry.get(professional.id);

    if (!marker || !this.map) {
      return;
    }

    this.map.panTo([professional.latitude, professional.longitude], { animate: true });
    marker.openPopup();
  }

  protected openContactRequestModal(professional: ProfessionalCardView): void {
    this.selectedProfessionalForContact = professional;
    this.isContactModalOpen = true;
    this.isSubmittingContactRequest = false;
    this.contactRequestError = '';
    this.contactMessage = '';
    this.shareContactEmail = true;
    this.shareContactPhone = false;
    this.parentPhone = '';
    this.ensureParentPatientsLoaded();

    if (this.parentPatients.length === 1) {
      this.selectedPatientId = this.parentPatients[0].id;
    } else {
      this.selectedPatientId = '';
    }
  }

  protected closeContactRequestModal(): void {
    this.isContactModalOpen = false;
    this.selectedProfessionalForContact = null;
    this.selectedPatientId = '';
    this.shareContactEmail = true;
    this.shareContactPhone = false;
    this.parentPhone = '';
    this.contactMessage = '';
    this.contactRequestError = '';
    this.isSubmittingContactRequest = false;
  }

  protected submitContactRequest(): void {
    if (!this.selectedProfessionalForContact) {
      return;
    }

    if (!this.shareContactEmail && !this.shareContactPhone) {
      this.contactRequestError =
        'Tenés que compartir al menos un medio de contacto para continuar.';
      return;
    }

    if (this.parentPatients.length > 0 && !this.selectedPatientId) {
      this.contactRequestError = 'Seleccioná el paciente asociado para enviar la solicitud.';
      return;
    }

    if (this.shareContactPhone && !this.parentPhone.trim()) {
      this.contactRequestError = 'Ingresá un teléfono de contacto o desmarcá esa opción.';
      return;
    }

    const payload: ContactRequestCreateRequest = {
      professionalId: this.selectedProfessionalForContact.id,
      patientId: this.selectedPatientId || null,
      shareEmail: this.shareContactEmail,
      sharePhone: this.shareContactPhone,
      parentPhone: this.shareContactPhone ? this.parentPhone.trim() || null : null,
      message: this.contactMessage.trim() || null,
    };

    this.isSubmittingContactRequest = true;
    this.contactRequestError = '';

    this.contactRequestService
      .createContactRequest(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmittingContactRequest = false;
          this.actionFeedbackTone = 'success';
          this.actionFeedback = `Solicitud enviada a ${this.selectedProfessionalForContact?.fullName}.`;
          this.closeContactRequestModal();
        },
        error: (error: unknown) => {
          this.isSubmittingContactRequest = false;
          this.contactRequestError = this.extractErrorMessage(error);
        },
      });
  }

  protected dismissActionFeedback(): void {
    this.actionFeedback = '';
    this.actionFeedbackTone = null;
  }

  protected getProfessionalRadiusLabel(professional: ProfessionalCardView): string {
    if (professional.coverageRadiusKm == null) {
      return 'Punto fijo';
    }

    return `Radio ${this.formatDistance(professional.coverageRadiusKm)}`;
  }

  protected formatDistance(value: number): string {
    return `${value.toFixed(1)} km`;
  }

  protected trackProfessional(_: number, professional: ProfessionalCardView): string {
    return professional.id;
  }

  private initializeMap(): void {
    if (!this.mapContainer || this.map) {
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      center: this.defaultCenter,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.professionalsLayer = L.layerGroup().addTo(this.map);
    this.institutionsLayer = L.layerGroup().addTo(this.map);
    this.coverageLayer = L.layerGroup().addTo(this.map);

    this.queryMarker = L.marker(this.defaultCenter, {
      icon: this.createMarkerIcon('query'),
    }).addTo(this.map);

    this.queryMarker.bindPopup('Punto de consulta');

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.queryLatitude = Number(event.latlng.lat.toFixed(6));
      this.queryLongitude = Number(event.latlng.lng.toFixed(6));
      this.queryMarker?.setLatLng([this.queryLatitude, this.queryLongitude]);
      this.loadNearbyData();
    });

    queueMicrotask(() => this.map?.invalidateSize());
  }

  private loadNearbyData(): void {
    this.isLoading = true;
    this.loadError = '';

    const institutionsRequest = this.institutionService.getNearbyInstitutions(
      this.queryLatitude,
      this.queryLongitude,
      this.radiusKm,
    );

    const professionalsRequest = this.canViewProfessionals
      ? this.professionalProfileService.getNearbyProfiles(
          this.queryLatitude,
          this.queryLongitude,
          this.radiusKm,
          this.selectedSpecialty || null,
          this.selectedHealthInsurance || null,
        )
      : of<ProfessionalProfileMapResponse[]>([]);

    const filterSourceRequest = this.canViewProfessionals
      ? this.professionalProfileService.getNearbyProfiles(
          this.queryLatitude,
          this.queryLongitude,
          this.radiusKm,
          null,
          null,
        )
      : of<ProfessionalProfileMapResponse[]>([]);

    forkJoin({
      institutions: institutionsRequest,
      professionals: professionalsRequest,
      filterSource: filterSourceRequest,
    })
      .pipe(
        switchMap(({ institutions, professionals, filterSource }) => {
          const uniqueProfileIds = Array.from(
            new Set([...professionals, ...filterSource].map((profile) => profile.id)),
          );
          const professionalDetailsRequest = uniqueProfileIds.length
            ? forkJoin(
                uniqueProfileIds.map((profileId) =>
                  this.professionalProfileService.getProfileById(profileId),
                ),
              )
            : of<ProfessionalProfileResponse[]>([]);

          return professionalDetailsRequest.pipe(
            map((professionalDetails) => ({
              institutions,
              professionals,
              filterSource,
              professionalDetails,
            })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ institutions, professionals, filterSource, professionalDetails }) => {
          this.institutions = institutions;
          this.professionals = professionals.map((profile) =>
            this.toProfessionalCardView(
              profile,
              professionalDetails.find((detail) => detail.id === profile.id) ?? null,
            ),
          );
          this.availableSpecialties = Array.from(
            new Set(
              filterSource
                .map((profile) => profile.specialty.trim())
                .filter((specialty) => specialty.length > 0),
            ),
          ).sort((left, right) => left.localeCompare(right, 'es'));
          this.availableHealthInsurances = Array.from(
            new Set(
              professionalDetails
                .reduce<string[]>(
                  (collection, detail) => collection.concat(detail.acceptedHealthInsurances ?? []),
                  [],
                )
                .map((healthInsurance: string) => healthInsurance.trim())
                .filter((healthInsurance: string) => healthInsurance.length > 0),
            ),
          ).sort((left: string, right: string) => left.localeCompare(right, 'es'));

          const shouldResetSpecialty =
            this.selectedSpecialty &&
            !this.availableSpecialties.some((specialty) => specialty === this.selectedSpecialty);
          const shouldResetHealthInsurance =
            this.selectedHealthInsurance &&
            !this.availableHealthInsurances.some(
              (healthInsurance) => healthInsurance === this.selectedHealthInsurance,
            );

          if (shouldResetSpecialty) {
            this.selectedSpecialty = '';
          }

          if (shouldResetHealthInsurance) {
            this.selectedHealthInsurance = '';
          }

          if (shouldResetSpecialty || shouldResetHealthInsurance) {
            this.loadNearbyData();
            return;
          }

          this.isLoading = false;
          this.renderMapLayers();
        },
        error: (error: unknown) => {
          this.isLoading = false;
          this.professionals = [];
          this.institutions = [];
          this.availableSpecialties = [];
          this.availableHealthInsurances = [];
          this.renderMapLayers();
          this.loadError = this.extractErrorMessage(error);
        },
      });
  }

  private renderMapLayers(): void {
    this.professionalsLayer?.clearLayers();
    this.institutionsLayer?.clearLayers();
    this.coverageLayer?.clearLayers();
    this.markerRegistry.clear();

    if (!this.map) {
      return;
    }

    if (this.canViewProfessionals && this.showProfessionals) {
      for (const professional of this.professionals) {
        const marker = L.marker([professional.latitude, professional.longitude], {
          icon: this.createMarkerIcon('professional'),
        });
        marker.bindPopup(this.buildProfessionalPopup(professional) as unknown as string);
        marker.addTo(this.professionalsLayer!);
        this.markerRegistry.set(professional.id, marker);

        if (professional.coverageRadiusKm != null) {
          L.circle([professional.latitude, professional.longitude], {
            radius: professional.coverageRadiusKm * 1000,
            color: '#45c7c0',
            fillColor: '#6ae4dd',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '7 7',
          }).addTo(this.coverageLayer!);
        }
      }
    }

    for (const institution of this.institutions) {
      const kind = this.categorizeInstitution(institution);

      if ((kind === 'school' && !this.showSchools) || (kind === 'office' && !this.showOffices)) {
        continue;
      }

      const marker = L.marker([institution.latitude, institution.longitude], {
        icon: this.createMarkerIcon(kind),
      });

      marker.bindPopup(this.buildInstitutionPopup(institution));
      marker.addTo(this.institutionsLayer!);
    }
  }

  private ensureParentPatientsLoaded(): void {
    if (!this.canViewProfessionals || this.parentPatientsLoaded || this.isLoadingParentPatients) {
      return;
    }

    this.isLoadingParentPatients = true;

    this.resolveParentId()
      .pipe(
        switchMap((parentId) => {
          if (!parentId) {
            return of<PatientResponse[]>([]);
          }

          this.parentId = parentId;
          return this.patientService.getPatientsByParentId(parentId);
        }),
        catchError((error: unknown) => {
          this.isLoadingParentPatients = false;
          this.actionFeedbackTone = 'error';
          this.actionFeedback = this.extractErrorMessage(error);
          return of<PatientResponse[]>([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((patients) => {
        this.parentPatients = patients;
        this.parentPatientsLoaded = true;
        this.isLoadingParentPatients = false;

        if (patients.length === 1) {
          this.selectedPatientId = patients[0].id;
        }
      });
  }

  private resolveParentId() {
    const sessionUserId = this.session?.userId ?? this.session?.id;

    if (sessionUserId) {
      return of(sessionUserId);
    }

    if (!this.session?.email) {
      return of<string | null>(null);
    }

    return this.userService.getParentProfileByEmail(this.session.email).pipe(
      map((profile) => profile.id),
      catchError(() => of<string | null>(null)),
    );
  }

  private toProfessionalCardView(
    profile: ProfessionalProfileMapResponse,
    detail: ProfessionalProfileResponse | null,
  ): ProfessionalCardView {
    const firstName = profile.user.firstName?.trim() ?? '';
    const lastName = profile.user.lastName?.trim() ?? '';
    const fullName = `${firstName} ${lastName}`.trim() || profile.user.email;

    return {
      ...profile,
      acceptedHealthInsurances: detail?.acceptedHealthInsurances ?? [],
      sessionFee: detail?.sessionFee ?? 0,
      fullName,
      initials: this.buildInitials(firstName, lastName, profile.user.email),
    };
  }

  private buildProfessionalPopup(professional: ProfessionalCardView): HTMLElement {
    const healthInsurances = professional.acceptedHealthInsurances.length
      ? professional.acceptedHealthInsurances.join(', ')
      : 'No informadas';

    const wrapper = document.createElement('div');
    wrapper.className = 'map-popup';
    wrapper.innerHTML = `
      <div class="map-popup__header">
        <div class="map-popup__avatar">${this.escapeHtml(professional.initials)}</div>
        <div class="map-popup__identity">
          <strong>${this.escapeHtml(professional.fullName)}</strong>
          <span>${this.escapeHtml(professional.specialty)}</span>
        </div>
      </div>
      <div class="map-popup__details">
        <div class="map-popup__row">
          <label>Email</label>
          <small>${this.escapeHtml(professional.user.email)}</small>
        </div>
        <div class="map-popup__row">
          <label>Honorarios ARS</label>
          <small>${this.escapeHtml(this.formatCurrency(professional.sessionFee))}</small>
        </div>
        <div class="map-popup__row">
          <label>Obras sociales</label>
          <small>${this.escapeHtml(healthInsurances)}</small>
        </div>
      </div>
    `;

    if (this.canViewProfessionals) {
      const actions = document.createElement('div');
      actions.className = 'map-popup__actions';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'map-popup__cta';
      button.textContent = 'Solicitar servicios';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.openContactRequestModal(professional);
      });

      actions.appendChild(button);
      wrapper.appendChild(actions);
    }

    return wrapper;
  }

  private buildInstitutionPopup(institution: InstitutionMapResponse): string {
    const kind = this.categorizeInstitution(institution);
    const detailsContent =
      kind === 'school'
        ? ''
        : `
          <div class="map-popup__details">
            <div class="map-popup__row">
              <label>Direccion</label>
              <small>${this.escapeHtml(institution.address)}</small>
            </div>
          </div>
        `;

    return `
      <div class="map-popup">
        <div class="map-popup__header">
          <div class="map-popup__avatar map-popup__avatar--institution">IN</div>
          <div class="map-popup__identity">
            <strong>${this.escapeHtml(institution.name)}</strong>
            <span>${this.escapeHtml(institution.type)}</span>
          </div>
        </div>
        ${detailsContent}
      </div>
    `;
  }

  private buildInitials(firstName: string, lastName: string, fallback: string): string {
    const tokens = [firstName, lastName].filter((value) => value.trim().length > 0);

    if (tokens.length === 0) {
      return fallback.slice(0, 2).toUpperCase();
    }

    return tokens
      .slice(0, 2)
      .map((value) => value.charAt(0).toUpperCase())
      .join('');
  }

  private categorizeInstitution(institution: InstitutionMapResponse): InstitutionKind {
    const normalizedType = institution.type.toLowerCase();
    const normalizedName = institution.name.toLowerCase();
    const schoolSignals = [normalizedType, normalizedName];

    if (
      schoolSignals.some((value) =>
        this.includesAny(value, ['escuela', 'colegio', 'jardin', 'jardín', 'instituto']),
      )
    ) {
      return 'school';
    }

    if (
      normalizedType.includes('consultorio') ||
      normalizedType.includes('centro') ||
      normalizedType.includes('clinica') ||
      normalizedType.includes('gabinete')
    ) {
      return 'office';
    }

    return 'school';
  }

  private includesAny(value: string, terms: string[]): boolean {
    return terms.some((term) => value.includes(term));
  }

  private createMarkerIcon(
    kind: 'professional' | 'school' | 'office' | 'query' | 'other',
  ): L.DivIcon {
    const config: Record<string, { label: string; className: string }> = {
      professional: {
        label: '',
        className: 'map-marker map-marker--professional map-marker--person',
      },
      school: { label: '', className: 'map-marker map-marker--school' },
      office: { label: 'C', className: 'map-marker map-marker--office' },
      query: { label: 'U', className: 'map-marker map-marker--query' },
      other: { label: 'I', className: 'map-marker map-marker--other' },
    };

    const selected = config[kind];
    const markerContent =
      kind === 'professional'
        ? `
          <span class="${selected.className}">
            <span class="map-marker__person-head"></span>
            <span class="map-marker__person-body"></span>
          </span>
        `
        : kind === 'school'
          ? `
            <span class="${selected.className}">
              <span class="map-marker__school-cap"></span>
              <span class="map-marker__school-band"></span>
              <span class="map-marker__school-tassel"></span>
            </span>
          `
          : `<span class="${selected.className}">${selected.label}</span>`;

    return L.divIcon({
      className: 'map-marker-shell',
      html: markerContent,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -26],
    });
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    }).format(value);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private extractErrorMessage(error: unknown): string {
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

    return 'No se pudo completar la operación solicitada.';
  }
}
