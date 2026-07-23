import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  AttendanceRecordCreateRequest,
  AttendanceRecordResponse,
  AttendanceRecordStatus,
  AttendanceRecordUpdateRequest,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class AttendanceRecordService {
  private readonly http = inject(HttpClient);
  private readonly recordsUrl = `${environment.apiBaseUrl}/api/attendance-records`;

  createAttendanceRecord(
    payload: AttendanceRecordCreateRequest,
  ): Observable<AttendanceRecordResponse> {
    return this.http.post<AttendanceRecordResponse>(this.recordsUrl, payload);
  }

  getAttendanceRecordById(id: string): Observable<AttendanceRecordResponse> {
    return this.http.get<AttendanceRecordResponse>(`${this.recordsUrl}/${id}`);
  }

  getAllAttendanceRecords(): Observable<AttendanceRecordResponse[]> {
    return this.http.get<AttendanceRecordResponse[]>(this.recordsUrl);
  }

  getAttendanceRecordsByProfessionalId(professionalId: string): Observable<AttendanceRecordResponse[]> {
    const params = new HttpParams().set('professionalId', professionalId);
    return this.http.get<AttendanceRecordResponse[]>(`${this.recordsUrl}/search/by-professional`, {
      params,
    });
  }

  getAttendanceRecordsByPatientId(patientId: string): Observable<AttendanceRecordResponse[]> {
    const params = new HttpParams().set('patientId', patientId);
    return this.http.get<AttendanceRecordResponse[]>(`${this.recordsUrl}/search/by-patient`, {
      params,
    });
  }

  getAttendanceRecordsByStatus(status: AttendanceRecordStatus): Observable<AttendanceRecordResponse[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<AttendanceRecordResponse[]>(`${this.recordsUrl}/search/by-status`, {
      params,
    });
  }

  updateAttendanceRecord(
    id: string,
    payload: AttendanceRecordUpdateRequest,
  ): Observable<AttendanceRecordResponse> {
    return this.http.put<AttendanceRecordResponse>(`${this.recordsUrl}/${id}`, payload);
  }

  deleteAttendanceRecord(id: string): Observable<void> {
    return this.http.delete<void>(`${this.recordsUrl}/${id}`);
  }
}
