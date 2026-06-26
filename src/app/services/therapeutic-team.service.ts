import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  TherapeuticTeamCreateRequest,
  TherapeuticTeamResponse,
  TherapeuticTeamUpdateRequest,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class TherapeuticTeamService {
  private readonly http = inject(HttpClient);
  private readonly teamsUrl = `${environment.apiBaseUrl}/api/therapeutic-teams`;

  createTherapeuticTeam(payload: TherapeuticTeamCreateRequest): Observable<TherapeuticTeamResponse> {
    return this.http.post<TherapeuticTeamResponse>(this.teamsUrl, payload);
  }

  getTherapeuticTeamById(id: string): Observable<TherapeuticTeamResponse> {
    return this.http.get<TherapeuticTeamResponse>(`${this.teamsUrl}/${id}`);
  }

  getAllTherapeuticTeams(): Observable<TherapeuticTeamResponse[]> {
    return this.http.get<TherapeuticTeamResponse[]>(this.teamsUrl);
  }

  getTherapeuticTeamsByPatientId(patientId: string): Observable<TherapeuticTeamResponse[]> {
    const params = new HttpParams().set('patientId', patientId);
    return this.http.get<TherapeuticTeamResponse[]>(`${this.teamsUrl}/search/by-patient`, { params });
  }

  getTherapeuticTeamsByProfessionalId(professionalId: string): Observable<TherapeuticTeamResponse[]> {
    const params = new HttpParams().set('professionalId', professionalId);
    return this.http.get<TherapeuticTeamResponse[]>(`${this.teamsUrl}/search/by-professional`, {
      params,
    });
  }

  updateTherapeuticTeam(
    id: string,
    payload: TherapeuticTeamUpdateRequest,
  ): Observable<TherapeuticTeamResponse> {
    return this.http.put<TherapeuticTeamResponse>(`${this.teamsUrl}/${id}`, payload);
  }

  deleteTherapeuticTeam(id: string): Observable<void> {
    return this.http.delete<void>(`${this.teamsUrl}/${id}`);
  }
}
