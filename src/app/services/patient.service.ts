import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { PatientCreateRequest, PatientResponse, PatientUpdateRequest } from '../models';

@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly patientsUrl = `${environment.apiBaseUrl}/api/patients`;

  createPatient(payload: PatientCreateRequest): Observable<PatientResponse> {
    return this.http.post<PatientResponse>(this.patientsUrl, payload);
  }

  getPatientById(id: string): Observable<PatientResponse> {
    return this.http.get<PatientResponse>(`${this.patientsUrl}/${id}`);
  }

  getAllPatients(): Observable<PatientResponse[]> {
    return this.http.get<PatientResponse[]>(this.patientsUrl);
  }

  getPatientsByParentId(parentId: string): Observable<PatientResponse[]> {
    const params = new HttpParams().set('parentId', parentId);
    return this.http.get<PatientResponse[]>(`${this.patientsUrl}/search/by-parent`, { params });
  }

  getPatientsByInstitutionId(institutionId: string): Observable<PatientResponse[]> {
    const params = new HttpParams().set('institutionId', institutionId);
    return this.http.get<PatientResponse[]>(
      `${this.patientsUrl}/search/by-institution`,
      { params },
    );
  }

  updatePatient(id: string, payload: PatientUpdateRequest): Observable<PatientResponse> {
    return this.http.put<PatientResponse>(`${this.patientsUrl}/${id}`, payload);
  }

  deletePatient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.patientsUrl}/${id}`);
  }
}
