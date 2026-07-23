import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  AttendanceBillingGenerateRequest,
  AttendanceBillingResponse,
  AttendanceBillingStatusUpdateRequest,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class AttendanceBillingService {
  private readonly http = inject(HttpClient);
  private readonly billingsUrl = `${environment.apiBaseUrl}/api/attendance-billings`;

  generateAttendanceBilling(
    payload: AttendanceBillingGenerateRequest,
  ): Observable<AttendanceBillingResponse> {
    return this.http.post<AttendanceBillingResponse>(`${this.billingsUrl}/generate`, payload);
  }

  getAttendanceBillingById(id: string): Observable<AttendanceBillingResponse> {
    return this.http.get<AttendanceBillingResponse>(`${this.billingsUrl}/${id}`);
  }

  getAllAttendanceBillings(): Observable<AttendanceBillingResponse[]> {
    return this.http.get<AttendanceBillingResponse[]>(this.billingsUrl);
  }

  getAttendanceBillingsByProfessionalId(professionalId: string): Observable<AttendanceBillingResponse[]> {
    const params = new HttpParams().set('professionalId', professionalId);
    return this.http.get<AttendanceBillingResponse[]>(`${this.billingsUrl}/search/by-professional`, {
      params,
    });
  }

  getAttendanceBillingsByPeriod(
    billingPeriod: string,
    dateFrom?: string | null,
    dateTo?: string | null,
  ): Observable<AttendanceBillingResponse[]> {
    let params = new HttpParams().set('billingPeriod', billingPeriod);

    if (dateFrom?.trim()) {
      params = params.set('dateFrom', dateFrom.trim());
    }

    if (dateTo?.trim()) {
      params = params.set('dateTo', dateTo.trim());
    }

    return this.http.get<AttendanceBillingResponse[]>(`${this.billingsUrl}/search/by-period`, {
      params,
    });
  }

  updateAttendanceBillingStatus(
    id: string,
    payload: AttendanceBillingStatusUpdateRequest,
  ): Observable<AttendanceBillingResponse> {
    return this.http.put<AttendanceBillingResponse>(`${this.billingsUrl}/${id}/status`, payload);
  }

  downloadAttendanceBillingPdf(id: string): Observable<Blob> {
    return this.http.get(`${this.billingsUrl}/${id}/pdf`, {
      responseType: 'blob',
    });
  }
}
