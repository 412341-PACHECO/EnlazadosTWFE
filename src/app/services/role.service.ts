import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { RoleCreateRequest, RoleResponse, RoleUpdateRequest } from '../models';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly rolesUrl = `${environment.apiBaseUrl}/api/roles`;

  createRole(payload: RoleCreateRequest): Observable<RoleResponse> {
    return this.http.post<RoleResponse>(this.rolesUrl, payload);
  }

  getRoleById(id: string): Observable<RoleResponse> {
    return this.http.get<RoleResponse>(`${this.rolesUrl}/${id}`);
  }

  getRoleByName(name: string): Observable<RoleResponse> {
    const params = new HttpParams().set('name', name);
    return this.http.get<RoleResponse>(`${this.rolesUrl}/search/by-name`, { params });
  }

  getAllRoles(): Observable<RoleResponse[]> {
    return this.http.get<RoleResponse[]>(this.rolesUrl);
  }

  updateRole(id: string, payload: RoleUpdateRequest): Observable<RoleResponse> {
    return this.http.put<RoleResponse>(`${this.rolesUrl}/${id}`, payload);
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${this.rolesUrl}/${id}`);
  }
}
