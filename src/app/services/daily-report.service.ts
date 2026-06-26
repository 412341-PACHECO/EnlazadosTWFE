import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  DailyReportCreateRequest,
  DailyReportResponse,
  DailyReportUpdateRequest,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class DailyReportService {
  private readonly http = inject(HttpClient);
  private readonly reportsUrl = `${environment.apiBaseUrl}/api/daily-reports`;

  createDailyReport(payload: DailyReportCreateRequest): Observable<DailyReportResponse> {
    return this.http.post<DailyReportResponse>(this.reportsUrl, payload);
  }

  getDailyReportById(id: string): Observable<DailyReportResponse> {
    return this.http.get<DailyReportResponse>(`${this.reportsUrl}/${id}`);
  }

  getAllDailyReports(): Observable<DailyReportResponse[]> {
    return this.http.get<DailyReportResponse[]>(this.reportsUrl);
  }

  getDailyReportsByPatientId(patientId: string): Observable<DailyReportResponse[]> {
    const params = new HttpParams().set('patientId', patientId);
    return this.http.get<DailyReportResponse[]>(`${this.reportsUrl}/search/by-patient`, { params });
  }

  getDailyReportsByAuthorId(authorId: string): Observable<DailyReportResponse[]> {
    const params = new HttpParams().set('authorId', authorId);
    return this.http.get<DailyReportResponse[]>(`${this.reportsUrl}/search/by-author`, { params });
  }

  updateDailyReport(id: string, payload: DailyReportUpdateRequest): Observable<DailyReportResponse> {
    return this.http.put<DailyReportResponse>(`${this.reportsUrl}/${id}`, payload);
  }

  deleteDailyReport(id: string): Observable<void> {
    return this.http.delete<void>(`${this.reportsUrl}/${id}`);
  }
}
