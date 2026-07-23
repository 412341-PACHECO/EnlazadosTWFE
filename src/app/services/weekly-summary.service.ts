import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { WeeklySummaryGenerateRequest, WeeklySummaryResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class WeeklySummaryService {
  private readonly http = inject(HttpClient);
  private readonly weeklySummariesUrl = `${environment.apiBaseUrl}/api/weekly-summaries`;

  generateWeeklySummary(payload: WeeklySummaryGenerateRequest): Observable<WeeklySummaryResponse> {
    return this.http.post<WeeklySummaryResponse>(`${this.weeklySummariesUrl}/generate`, payload);
  }

  getWeeklySummaryById(id: string): Observable<WeeklySummaryResponse> {
    return this.http.get<WeeklySummaryResponse>(`${this.weeklySummariesUrl}/${id}`);
  }

  getWeeklySummariesByPatientId(patientId: string): Observable<WeeklySummaryResponse[]> {
    const params = new HttpParams().set('patientId', patientId);
    return this.http.get<WeeklySummaryResponse[]>(`${this.weeklySummariesUrl}/search/by-patient`, {
      params,
    });
  }

  getLatestWeeklySummaryByPatientId(patientId: string): Observable<WeeklySummaryResponse> {
    const params = new HttpParams().set('patientId', patientId);
    return this.http.get<WeeklySummaryResponse>(
      `${this.weeklySummariesUrl}/search/latest-by-patient`,
      { params },
    );
  }
}
