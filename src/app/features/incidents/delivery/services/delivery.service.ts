import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse, DeliveryCreateOptions } from '../models/delivery-create-options';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private readonly http = inject(HttpClient);

  getCreateOptions() {
    return this.http
      .get<ApiResponse<DeliveryCreateOptions>>(
        `${environment.apiUrl}/api/deliveries/create-options`,
      )
      .pipe(map((response) => response.data));
  }
}
