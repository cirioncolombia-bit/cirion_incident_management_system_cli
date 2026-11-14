import { DeliveryStatusHistoryData } from '../models/delivery-status-history';
import { DeliveryEditData, UpdateDeliveryEdit } from '../models/delivery-edit';
import { DeliverySummary, DeliveryListQuery, DeliveryPage, DeliveryFilterOption, DeliveryFilterOptions } from '../models/delivery-summary';
import { CreateDelivery, CreatedDelivery } from '../models/create-delivery';
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse, DeliveryCreateOptions } from '../models/delivery-create-options';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private readonly http = inject(HttpClient);

  getStatusHistory(id: number) {
    return this.http
      .get<ApiResponse<DeliveryStatusHistoryData>>(`${environment.apiUrl}/api/Delivery/${id}/status-history`)
      .pipe(map((response) => response.data));
  }

  getEdit(id: number) {
    return this.http
      .get<ApiResponse<DeliveryEditData>>(`${environment.apiUrl}/api/Delivery/${id}/edit`)
      .pipe(map((response) => response.data));
  }

  updateEdit(id: number, request: UpdateDeliveryEdit) {
    return this.http
      .put<ApiResponse<CreatedDelivery>>(`${environment.apiUrl}/api/Delivery/${id}/edit`, request)
      .pipe(map((response) => response.data));
  }

  getFilterOptions() {
    return this.http.get<ApiResponse<DeliveryFilterOptions>>(`${environment.apiUrl}/api/Delivery/filter-options`)
      .pipe(map(response => response.data));
  }

  getFilterNodes(cityId: number) {
    return this.http.get<ApiResponse<DeliveryFilterOption[]>>(`${environment.apiUrl}/api/Delivery/filter-nodes`, { params: { cityId } })
      .pipe(map(response => response.data));
  }

  getPage(query: DeliveryListQuery) {
    let params = new HttpParams().set('Page', query.page).set('PageSize', query.pageSize);
    if (query.search?.trim()) params = params.set('Search', query.search.trim());
    for (const key of ['year', 'month', 'day', 'statusId', 'cityId', 'nodeId', 'eaimId', 'createdBy'] as const) {
      if (query[key] != null) params = params.set(key, query[key]!);
    }
    if (query.status) params = params.set('Status', query.status);
    if (query.deliveryId) params = params.set('DeliveryId', query.deliveryId);
    return this.http.get<ApiResponse<DeliveryPage>>(`${environment.apiUrl}/api/Delivery/paged`, { params })
      .pipe(map(response => response.data));
  }

  getAll() {
    return this.http
      .get<ApiResponse<DeliverySummary[]>>(`${environment.apiUrl}/api/Delivery`)
      .pipe(map((response) => response.data));
  }

  create(request: CreateDelivery) {
    return this.http
      .post<ApiResponse<CreatedDelivery>>(`${environment.apiUrl}/api/Delivery`, request)
      .pipe(map((response) => response.data));
  }

  getCreateOptions() {
    return this.http
      .get<ApiResponse<DeliveryCreateOptions>>(
        `${environment.apiUrl}/api/deliveries/create-options`,
      )
      .pipe(map((response) => response.data));
  }
}
