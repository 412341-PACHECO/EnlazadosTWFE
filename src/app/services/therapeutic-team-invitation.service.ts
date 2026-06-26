import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  TherapeuticTeamInvitationAcceptRequest,
  TherapeuticTeamInvitationCreateRequest,
  TherapeuticTeamInvitationResponse,
  TherapeuticTeamInvitationTokenInfo,
  TherapeuticTeamResponse,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class TherapeuticTeamInvitationService {
  private readonly http = inject(HttpClient);
  private readonly invitationsUrl = `${environment.apiBaseUrl}/api/therapeutic-team-invitations`;
  private readonly publicInvitationsUrl =
    `${environment.apiBaseUrl}/api/public/therapeutic-team-invitations`;

  createInvitation(
    patientId: string,
    payload: TherapeuticTeamInvitationCreateRequest,
  ): Observable<TherapeuticTeamInvitationResponse> {
    return this.http.post<TherapeuticTeamInvitationResponse>(
      `${this.invitationsUrl}/patients/${patientId}`,
      payload,
    );
  }

  getInvitationsByPatient(patientId: string): Observable<TherapeuticTeamInvitationResponse[]> {
    return this.http.get<TherapeuticTeamInvitationResponse[]>(
      `${this.invitationsUrl}/patients/${patientId}`,
    );
  }

  acceptInvitation(payload: TherapeuticTeamInvitationAcceptRequest): Observable<TherapeuticTeamResponse> {
    return this.http.post<TherapeuticTeamResponse>(`${this.invitationsUrl}/accept`, payload);
  }

  cancelInvitation(invitationId: string): Observable<void> {
    return this.http.delete<void>(`${this.invitationsUrl}/${invitationId}`);
  }

  validateToken(token: string): Observable<TherapeuticTeamInvitationTokenInfo> {
    return this.http.get<TherapeuticTeamInvitationTokenInfo>(`${this.publicInvitationsUrl}/validate`, {
      params: { token },
    });
  }
}
