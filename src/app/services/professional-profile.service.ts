import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ProfessionalProfileCreateRequest,
  ProfessionalProfileResponse,
  ProfessionalProfileUpdateRequest,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class ProfessionalProfileService {
  private readonly http = inject(HttpClient);
  private readonly profilesUrl = `${environment.apiBaseUrl}/api/professional-profiles`;

  createProfessionalProfile(
    payload: ProfessionalProfileCreateRequest,
  ): Observable<ProfessionalProfileResponse> {
    return this.http.post<ProfessionalProfileResponse>(this.profilesUrl, payload);
  }

  getProfileById(id: string): Observable<ProfessionalProfileResponse> {
    return this.http.get<ProfessionalProfileResponse>(`${this.profilesUrl}/${id}`);
  }

  getProfileByUserId(userId: string): Observable<ProfessionalProfileResponse> {
    return this.http.get<ProfessionalProfileResponse>(`${this.profilesUrl}/user/${userId}`);
  }

  getAllProfiles(): Observable<ProfessionalProfileResponse[]> {
    return this.http.get<ProfessionalProfileResponse[]>(this.profilesUrl);
  }

  getProfilesBySpecialty(specialty: string): Observable<ProfessionalProfileResponse[]> {
    const params = new HttpParams().set('specialty', specialty);
    return this.http.get<ProfessionalProfileResponse[]>(`${this.profilesUrl}/search/by-specialty`, {
      params,
    });
  }

  getProfileByLicenseNumber(licenseNumber: string): Observable<ProfessionalProfileResponse> {
    const params = new HttpParams().set('licenseNumber', licenseNumber);
    return this.http.get<ProfessionalProfileResponse>(`${this.profilesUrl}/search/by-license`, {
      params,
    });
  }

  updateProfessionalProfile(
    id: string,
    payload: ProfessionalProfileUpdateRequest,
  ): Observable<ProfessionalProfileResponse> {
    return this.http.put<ProfessionalProfileResponse>(`${this.profilesUrl}/${id}`, payload);
  }

  deleteProfessionalProfile(id: string): Observable<void> {
    return this.http.delete<void>(`${this.profilesUrl}/${id}`);
  }
}
