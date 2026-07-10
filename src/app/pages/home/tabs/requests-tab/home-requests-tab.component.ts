import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  callOutline,
  checkmarkCircleOutline,
  mailOutline,
  personAddOutline,
  timeOutline,
} from 'ionicons/icons';
import { switchMap } from 'rxjs';

import { AuthResponse, ContactRequestResponse } from '../../../../models';
import { ContactRequestService } from '../../../../services/contact-request.service';
import { ProfessionalProfileService } from '../../../../services/professional-profile.service';

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
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) session: AuthResponse | null = null;

  protected requests: ContactRequestResponse[] = [];
  protected isLoading = false;
  protected loadError = '';

  constructor() {
    addIcons({
      callOutline,
      checkmarkCircleOutline,
      mailOutline,
      personAddOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    this.loadRequests();
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

  protected trackRequest(_: number, request: ContactRequestResponse): string {
    return request.id;
  }

  private loadRequests(): void {
    if (!this.session?.email || this.session.role !== 'PROFESSIONAL') {
      this.requests = [];
      return;
    }

    this.isLoading = true;
    this.loadError = '';

    this.professionalProfileService
      .getProfileByUserEmail(this.session.email)
      .pipe(
        switchMap((profile) =>
          this.contactRequestService.getContactRequestsByProfessional(profile.id),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (requests) => {
          this.requests = [...requests].sort(
            (left, right) =>
              new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
          );
          this.isLoading = false;
        },
        error: (error: unknown) => {
          this.requests = [];
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
