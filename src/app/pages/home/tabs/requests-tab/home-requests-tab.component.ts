import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  callOutline,
  cashOutline,
  checkmarkCircleOutline,
  mailOutline,
  medicalOutline,
  personAddOutline,
  timeOutline,
} from 'ionicons/icons';
import { of, switchMap } from 'rxjs';

import {
  AuthResponse,
  ContactRequestResponse,
  ParentContactRequestResponse,
} from '../../../../models';
import { ContactRequestService } from '../../../../services/contact-request.service';
import { ProfessionalProfileService } from '../../../../services/professional-profile.service';
import { UserService } from '../../../../services/user.service';

@Component({
  selector: 'app-home-requests-tab',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './home-requests-tab.component.html',
  styleUrl: './home-requests-tab.component.scss',
})
export class HomeRequestsTabComponent implements OnInit {
  private readonly professionalProfileService = inject(ProfessionalProfileService);
  private readonly contactRequestService = inject(ContactRequestService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) session: AuthResponse | null = null;

  protected professionalRequests: ContactRequestResponse[] = [];
  protected parentRequests: ParentContactRequestResponse[] = [];
  protected isLoading = false;
  protected loadError = '';

  constructor() {
    addIcons({
      callOutline,
      cashOutline,
      checkmarkCircleOutline,
      mailOutline,
      medicalOutline,
      personAddOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    if (this.isProfessionalRole) {
      this.loadProfessionalRequests();
      return;
    }

    if (this.isParentRole) {
      this.loadParentRequests();
    }
  }

  protected get isProfessionalRole(): boolean {
    return this.session?.role === 'PROFESSIONAL';
  }

  protected get isParentRole(): boolean {
    return this.session?.role === 'PARENT';
  }

  protected getRequestTimestamp(value: string): string {
    const timestamp = new Date(value);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  }

  protected getStatusLabel(status: string): string {
    return status === 'VIEWED' ? 'Vista' : 'Pendiente';
  }

  protected trackProfessionalRequest(_: number, request: ContactRequestResponse): string {
    return request.id;
  }

  protected trackParentRequest(_: number, request: ParentContactRequestResponse): string {
    return request.id;
  }

  protected getProfessionalFullName(request: ParentContactRequestResponse): string {
    return `${request.professional.firstName} ${request.professional.lastName}`.trim();
  }

  protected getHealthInsurancesLabel(request: ParentContactRequestResponse): string {
    const items = request.professional.acceptedHealthInsurances ?? [];
    return items.length ? items.join(', ') : 'Sin obras sociales informadas';
  }

  protected getSessionFeeLabel(value: number | null): string {
    if (value == null) {
      return 'Honorario no informado';
    }

    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private loadProfessionalRequests(): void {
    if (!this.session?.email) {
      this.professionalRequests = [];
      return;
    }

    this.isLoading = true;
    this.loadError = '';

    this.professionalProfileService
      .getProfileByUserEmail(this.session.email)
      .pipe(
        switchMap((profile) =>
          this.contactRequestService.markAllContactRequestsAsViewed(profile.id).pipe(
            switchMap(() => this.contactRequestService.getContactRequestsByProfessional(profile.id)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (requests) => {
          this.professionalRequests = [...requests].sort(
            (left, right) =>
              new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
          );
          this.parentRequests = [];
          this.isLoading = false;
        },
        error: (error: unknown) => {
          this.professionalRequests = [];
          this.isLoading = false;
          this.loadError = this.extractErrorMessage(error);
        },
      });
  }

  private loadParentRequests(): void {
    const sessionUserId = this.session?.userId ?? this.session?.id;
    this.isLoading = true;
    this.loadError = '';

    const parentId$ = sessionUserId
      ? of(sessionUserId)
      : this.session?.email
        ? this.userService.getParentProfileByEmail(this.session.email).pipe(
            switchMap((profile) => of(profile.id)),
          )
        : of<string | null>(null);

    parentId$
      .pipe(
        switchMap((parentId) => {
          if (!parentId) {
            return of<ParentContactRequestResponse[]>([]);
          }

          return this.contactRequestService.getContactRequestsByParent(parentId);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (requests) => {
          this.parentRequests = [...requests].sort((left, right) => {
            if (left.status !== right.status) {
              return left.status === 'PENDING' ? -1 : 1;
            }

            return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
          });
          this.professionalRequests = [];
          this.isLoading = false;
        },
        error: (error: unknown) => {
          this.parentRequests = [];
          this.isLoading = false;
          this.loadError = this.extractErrorMessage(error);
        },
      });
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

    return 'No se pudieron cargar las solicitudes de contacto.';
  }
}
