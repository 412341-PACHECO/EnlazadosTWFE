import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ParentProfileResponse,
  UserCreateRequest,
  UserResponse,
  UserUpdateRequest,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly usersUrl = `${environment.apiBaseUrl}/api/users`;

  createUser(payload: UserCreateRequest): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.usersUrl, payload);
  }

  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.usersUrl}/${id}`);
  }

  getUserByEmail(email: string): Observable<UserResponse> {
    const params = new HttpParams().set('email', email);
    return this.http.get<UserResponse>(`${this.usersUrl}/search/by-email`, { params });
  }

  getParentProfileById(id: string): Observable<ParentProfileResponse> {
    return this.http.get<ParentProfileResponse>(`${this.usersUrl}/parents/${id}`);
  }

  getParentProfileByEmail(email: string): Observable<ParentProfileResponse> {
    const params = new HttpParams().set('email', email);
    return this.http.get<ParentProfileResponse>(`${this.usersUrl}/parents/search/by-email`, { params });
  }

  getAllUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.usersUrl);
  }

  getActiveUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.usersUrl}/active`);
  }

  getUsersByRole(roleId: string): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.usersUrl}/by-role/${roleId}`);
  }

  updateUser(id: string, payload: UserUpdateRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.usersUrl}/${id}`, payload);
  }

  deactivateUser(id: string): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.usersUrl}/${id}/deactivate`, {});
  }

  activateUser(id: string): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.usersUrl}/${id}/activate`, {});
  }
}
