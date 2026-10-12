import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
export interface IncidentOption {
  id: number;
  name: string;
  isInitial?: boolean;
}
export interface IncidentOptions {
  types: IncidentOption[];
  statuses: IncidentOption[];
  users: IncidentOption[];
}
export interface IncidentRecord {
  id: number;
  title: string;
  description: string;
  typeId: number;
  typeName: string;
  statusId: number;
  statusName: string;
  creatorId: number;
  creatorName: string;
  assigneeId: number | null;
  assigneeName: string | null;
  createAt: string;
  updatedAt: string | null;
}
export interface Observation {
  id: number;
  text: string;
  authorId: number;
  authorName: string;
  createAt: string;
}
export interface Attachment {
  id: number;
  fileName: string;
  size: number;
  authorId: number;
  authorName: string;
  createAt: string;
  downloadPath: string;
}
export interface IncidentDetail {
  incident: IncidentRecord;
  observations: Observation[];
  attachments: Attachment[];
}
export interface IncidentPage {
  rows: IncidentRecord[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
export interface IncidentWrite {
  typeId: number;
  title: string;
  description: string;
  statusId?: number;
}
interface Envelope<T> {
  data: T;
}
@Injectable({ providedIn: 'root' })
export class IncidentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/Incident`;
  me() {
    return this.http
      .get<Envelope<{ permissions: string[] }>>(`${environment.apiUrl}/api/Auth/me`)
      .pipe(map((r) => r.data));
  }
  options() {
    return this.http
      .get<Envelope<IncidentOptions>>(`${this.base}/form-options`)
      .pipe(map((r) => r.data));
  }
  list(
    page: number,
    filters: { search: string; typeId: string; statusId: string; assigneeId: string },
  ) {
    let params = new HttpParams().set('Page', page).set('PageSize', 12);
    for (const [key, value] of Object.entries(filters)) if (value) params = params.set(key, value);
    return this.http.get<IncidentPage>(this.base, { params });
  }
  detail(id: number) {
    return this.http.get<Envelope<IncidentDetail>>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }
  create(body: IncidentWrite) {
    return this.http.post<Envelope<number>>(this.base, body).pipe(map((r) => r.data));
  }
  update(id: number, body: IncidentWrite) {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }
  assign(id: number, userId: number | null) {
    return this.http.put<void>(`${this.base}/${id}/assignment`, { userId });
  }
  observe(id: number, text: string) {
    return this.http.post<Envelope<number>>(`${this.base}/${id}/observations`, { text });
  }
  upload(id: number, file: File) {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<Envelope<number>>(`${this.base}/${id}/attachments`, body);
  }
  download(id: number, attachmentId: number) {
    return this.http.get(`${this.base}/${id}/attachments/${attachmentId}/content`, {
      responseType: 'blob',
    });
  }
  deactivate(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
