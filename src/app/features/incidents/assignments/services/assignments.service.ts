import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
export interface Option {
  id: number;
  name: string;
}
export interface DeliveryLookup {
  id: number;
  workOrderId: string;
  clientName: string;
  buildingSite: string;
  address: string;
  cityId: number;
  cityName: string;
  nodeId: number;
  nodeName: string;
  gcos: Option[];
}
export interface PortOption {
  id: number;
  fiberTrayId: number;
  fiberTrayName: string;
  gcoId: number;
  portNumber: number;
  equipmentName: string | null;
  conduitName?: string | null;
  fiberColorName?: string | null;
  statusId: number;
  statusName: string;
  rowVersion: string;
}
export interface Assignment {
  id: number;
  deliveryId: number | null;
  workOrderId: string | null;
  clientName: string | null;
  cityName: string;
  nodeName: string;
  gcoId: number;
  gcoName: string;
  fiberTrayName: string;
  port: PortOption;
  createAt: string;
  updatedAt: string | null;
  rowVersion: string;
}
export interface Page<T> {
  rows: T[];
  page: number;
  totalPages: number;
  totalCount: number;
}
export interface AssignmentWrite {
  deliveryId: number;
  portId: number;
  statusId: number;
  equipmentName: string | null;
  portVersion: string;
  rowVersion?: string;
}
@Injectable({ providedIn: 'root' })
export class AssignmentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/Assignment`;
  me() {
    return this.http
      .get<{ data: { permissions: string[] } }>(`${environment.apiUrl}/api/Auth/me`)
      .pipe(map((r) => r.data));
  }
  list(page: number, search: string) {
    return this.http.get<Page<Assignment>>(this.base, {
      params: new HttpParams().set('Page', page).set('PageSize', 12).set('Search', search),
    });
  }
  detail(id: number) {
    return this.http.get<{ data: Assignment }>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }
  delivery(id: number) {
    return this.http
      .get<{ data: DeliveryLookup }>(`${this.base}/deliveries/${id}`)
      .pipe(map((r) => r.data));
  }
  fiberTrays(deliveryId: number, gcoId: number) {
    return this.http
      .get<{ data: Option[] }>(`${this.base}/deliveries/${deliveryId}/gcos/${gcoId}/fiber-trays`)
      .pipe(map((r) => r.data));
  }
  ports(
    deliveryId: number,
    gcoId: number,
    page: number,
    search: string,
    fiberTrayId?: number,
    statusId?: number,
  ) {
    let params = new HttpParams().set('Page', page).set('PageSize', 20).set('Search', search);
    if (fiberTrayId) params = params.set('FiberTrayId', fiberTrayId);
    if (statusId) params = params.set('StatusId', statusId);
    return this.http.get<Page<PortOption>>(
      `${this.base}/deliveries/${deliveryId}/gcos/${gcoId}/ports`,
      { params },
    );
  }
  options() {
    return this.http
      .get<{ data: { statuses: Option[] } }>(`${this.base}/form-options`)
      .pipe(map((r) => r.data));
  }
  save(id: number | null, body: AssignmentWrite) {
    return id === null
      ? this.http.post<{ data: number }>(this.base, body).pipe(map((r) => r.data))
      : this.http.put<{ data: number }>(`${this.base}/${id}`, body).pipe(map((r) => r.data));
  }
  deactivate(id: number, rowVersion: string) {
    return this.http.delete<void>(`${this.base}/${id}`, { body: { rowVersion } });
  }
}
