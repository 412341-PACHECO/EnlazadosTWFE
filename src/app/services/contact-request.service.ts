import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { ContactRequestCreateRequest, ContactRequestResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ContactRequestService {
  private readonly http = inject(HttpClient);
  private readonly contactRequestsUrl = `${environment.apiBaseUrl}/api/contact-requests`;

  createContactRequest(
    payload: ContactRequestCreateRequest,
  ): Observable<ContactRequestResponse> {
    return this.http.post<ContactRequestResponse>(this.contactRequestsUrl, payload);
  }

  getContactRequestsByProfessional(professionalId: string): Observable<ContactRequestResponse[]> {
    const params = new HttpParams().set('professionalId', professionalId);
    return this.http.get<ContactRequestResponse[]>(
      `${this.contactRequestsUrl}/search/by-professional`,
      { params },
    );
  }
}
