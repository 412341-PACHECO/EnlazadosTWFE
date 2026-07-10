import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ProfessionalProfileCreateRequest,
  ProfessionalProfileMapResponse,
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

  getProfileByUserEmail(email: string): Observable<ProfessionalProfileResponse> {
    const params = new HttpParams().set('email', email);
    return this.http.get<ProfessionalProfileResponse>(`${this.profilesUrl}/search/by-user-email`, {
      params,
    });
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

  getNearbyProfiles(
    latitude: number,
    longitude: number,
    radiusKm: number,
    specialty?: string | null,
    acceptedHealthInsurance?: string | null,
  ): Observable<ProfessionalProfileMapResponse[]> {
    let params = new HttpParams()
      .set('latitude', `${latitude}`)
      .set('longitude', `${longitude}`)
      .set('radiusKm', `${radiusKm}`);

    if (specialty?.trim()) {
      params = params.set('specialty', specialty.trim());
    }

    if (acceptedHealthInsurance?.trim()) {
      params = params.set('acceptedHealthInsurance', acceptedHealthInsurance.trim());
    }

    return this.http.get<ProfessionalProfileMapResponse[]>(`${this.profilesUrl}/map/nearby`, {
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
