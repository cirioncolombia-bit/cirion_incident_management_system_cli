import { DeliverySummary } from '../models/delivery-summary';
import { CreateDelivery, CreatedDelivery } from '../models/create-delivery';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse, DeliveryCreateOptions } from '../models/delivery-create-options';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private readonly http = inject(HttpClient);

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
