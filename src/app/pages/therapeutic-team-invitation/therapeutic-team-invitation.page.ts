import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  heart,
  mailOpenOutline,
  personAddOutline,
  warningOutline,
} from 'ionicons/icons';

import { TherapeuticTeamInvitationTokenInfo } from '../../models';
import { TherapeuticTeamInvitationService } from '../../services/therapeutic-team-invitation.service';

@Component({
  selector: 'app-therapeutic-team-invitation',
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonIcon, IonSpinner],
  templateUrl: './therapeutic-team-invitation.page.html',
  styleUrl: './therapeutic-team-invitation.page.scss',
})
export class TherapeuticTeamInvitationPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invitationService = inject(TherapeuticTeamInvitationService);
  private readonly destroyRef = inject(DestroyRef);

  protected token = '';
  protected tokenInfo: TherapeuticTeamInvitationTokenInfo | null = null;
  protected isLoading = true;
  protected isAccepting = false;
  protected loadError = '';
  protected acceptError = '';
  protected acceptSuccess = '';

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      heart,
      mailOpenOutline,
      personAddOutline,
      warningOutline,
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.token = params.get('token') ?? '';

      if (!this.token) {
        this.isLoading = false;
        this.loadError = 'El enlace de invitación es inválido o está incompleto.';
        return;
      }

      this.validateToken();
    });
  }

  protected get canAccept(): boolean {
    return !!this.tokenInfo && this.tokenInfo.status === 'PENDING';
  }

  protected acceptInvitation(): void {
    if (!this.token || !this.canAccept) {
      return;
    }

    this.acceptError = '';
    this.acceptSuccess = '';
    this.isAccepting = true;

    this.invitationService
      .acceptInvitation({ token: this.token })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isAccepting = false;
          this.acceptSuccess = 'La invitación fue aceptada correctamente.';
          void this.router.navigate(['/home']);
        },
        error: (error: unknown) => {
          this.isAccepting = false;
          this.acceptError = this.extractErrorMessage(error, 'No se pudo aceptar la invitación.');
        },
      });
  }

  private validateToken(): void {
    this.isLoading = true;
    this.loadError = '';
    this.acceptError = '';
    this.acceptSuccess = '';

    this.invitationService
      .validateToken(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (info) => {
          this.isLoading = false;
          this.tokenInfo = info;
        },
        error: (error: unknown) => {
          this.isLoading = false;
          this.loadError = this.extractErrorMessage(
            error,
            'No se pudo validar la invitación enviada por correo.',
          );
        },
      });
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
