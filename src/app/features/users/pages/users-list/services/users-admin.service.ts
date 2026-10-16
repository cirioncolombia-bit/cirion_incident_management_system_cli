import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
export type Section = 'users' | 'roles' | 'permissions' | 'eaims';
export interface Option {
  id: number;
  name: string;
  description?: string;
}
export interface Catalog {
  id: number;
  name?: string;
  code?: string;
  description?: string;
  permissionIds?: number[];
}
export interface UserRecord {
  id: number;
  firstName: string;
  secondName: string | null;
  firstSurname: string;
  secondSurname: string | null;
  email: string;
  areaId: number;
  areaName: string | null;
  eaimId: number | null;
  eaimName: string | null;
  userType: number | null;
  roles: Option[];
  isActive: boolean;
  isLocked: boolean | null;
  lockedUntil: string | null;
  failedLoginAttempts: number | null;
  lastLoginAt: string | null;
  createAt: string;
}
export interface UserWrite {
  firstName: string;
  secondName: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  areaId: number;
  eaimId: number | null;
  userType: number;
  password?: string;
  roleIds?: number[];
}
export interface UserPage {
  rows: UserRecord[];
  page: number;
  totalPages: number;
  totalCount: number;
}
export interface Options {
  areas: Option[];
  eaims: Option[];
  roles: Option[];
}
export interface CurrentUser {
  id: number;
  isExternal: boolean;
  permissions: string[];
}
interface Envelope<T> {
  data: T;
  message?: string;
}
@Injectable({ providedIn: 'root' })
export class UsersAdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;
  private readonly paths: Record<Section, string> = {
    users: 'User',
    roles: 'Roles',
    permissions: 'Permission',
    eaims: 'Eaim',
  };
  me() {
    return this.http.get<Envelope<CurrentUser>>(`${this.base}/Auth/me`).pipe(map((r) => r.data));
  }
  options() {
    return this.http
      .get<Envelope<Options>>(`${this.base}/User/form-options`)
      .pipe(map((r) => r.data));
  }
  users(
    page: number,
    filters: {
      search: string;
      eaimId: string;
      roleId: string;
      userType: string;
      includeInactive: boolean;
    },
  ) {
    let params = new HttpParams()
      .set('Page', page)
      .set('PageSize', 12)
      .set('IncludeInactive', filters.includeInactive);
    for (const [key, value] of Object.entries(filters))
      if (key !== 'includeInactive' && value) params = params.set(key, String(value));
    return this.http.get<UserPage>(`${this.base}/User`, { params });
  }
  user(id: number) {
    return this.http
      .get<Envelope<UserRecord>>(`${this.base}/User/${id}`, { params: { includeInactive: true } })
      .pipe(map((r) => r.data));
  }
  catalogs(section: Exclude<Section, 'users'>) {
    return this.http
      .get<Envelope<Catalog[]>>(`${this.base}/${this.paths[section]}`)
      .pipe(map((r) => r.data));
  }
  save(section: Section, id: number | null, body: object) {
    const url = `${this.base}/${this.paths[section]}${id === null ? '' : '/' + id}`;
    return id === null ? this.http.post(url, body) : this.http.put(url, body);
  }
  resetPassword(id: number, newPassword: string) {
    return this.http.post<void>(`${this.base}/User/${id}/reset-password`, { newPassword });
  }
  roles(id: number, roleIds: number[]) {
    return this.http.put(`${this.base}/User/${id}/roles`, { roleIds });
  }
  deactivate(section: Section, id: number) {
    return this.http.delete(`${this.base}/${this.paths[section]}/${id}`);
  }
}
