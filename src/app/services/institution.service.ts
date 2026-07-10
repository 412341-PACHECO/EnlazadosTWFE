import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { InstitutionMapResponse, InstitutionResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class InstitutionService {
  private readonly http = inject(HttpClient);
  private readonly institutionsUrl = `${environment.apiBaseUrl}/api/institutions`;

  getAllInstitutions(): Observable<InstitutionResponse[]> {
    return this.http.get<InstitutionResponse[]>(this.institutionsUrl);
  }

  getNearbyInstitutions(
    latitude: number,
    longitude: number,
    radiusKm: number,
    type?: string | null,
  ): Observable<InstitutionMapResponse[]> {
    let params = new HttpParams()
      .set('latitude', `${latitude}`)
      .set('longitude', `${longitude}`)
      .set('radiusKm', `${radiusKm}`);

    if (type?.trim()) {
      params = params.set('type', type.trim());
    }

    return this.http.get<InstitutionMapResponse[]>(`${this.institutionsUrl}/map/nearby`, {
      params,
    });
  }
}
