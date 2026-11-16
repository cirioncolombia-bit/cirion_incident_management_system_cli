import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  LocationOption,
  ChartSeries,
  CityRank,
  Indicator,
  MeasurementType,
  MonthlyRecord,
  Page,
  Query,
} from '../models/indicators';

@Injectable({ providedIn: 'root' })
export class IndicatorsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/Indicators`;
  private get<T>(path: string, query: Query) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query))
      if (value !== null && value !== undefined && value !== '')
        params = params.set(key, String(value));
    return this.http.get<{ data: T }>(this.url + path, { params }).pipe(map((x) => x.data));
  }
  locations(kind: 'cities' | 'nodes', query: Query) {
    return this.get<Page<LocationOption>>('/locations/' + kind, query);
  }
  list(query: Query = {}) {
    return this.get<Page<Indicator>>('', query);
  }
  records(query: Query) {
    return this.get<Page<MonthlyRecord>>('/records', query);
  }
  cityCharts(query: Query) {
    return this.get<Page<CityRank>>('/city-charts', query);
  }
  charts(query: Query) {
    return this.get<Page<ChartSeries>>('/charts', query);
  }
  saveIndicator(
    id: number | null,
    body: { name: string; measurementType: MeasurementType; rowVersion?: string },
  ) {
    return (
      id === null
        ? this.http.post<{ data: Indicator }>(this.url, body)
        : this.http.put<{ data: Indicator }>(`${this.url}/${id}`, body)
    ).pipe(map((x) => x.data));
  }
  saveRecord(
    id: number | null,
    body: {
      cityId: number;
      nodeId: number;
      indicatorId: number;
      year: number;
      month: number;
      value: string;
      rowVersion?: string;
    },
  ) {
    return (
      id === null
        ? this.http.post<{ data: MonthlyRecord }>(this.url + '/records', body)
        : this.http.put<{ data: MonthlyRecord }>(`${this.url}/records/${id}`, body)
    ).pipe(map((x) => x.data));
  }
  deleteIndicator(row: Indicator) {
    return this.http.delete(`${this.url}/${row.id}`, { params: { rowVersion: row.rowVersion } });
  }
  deleteRecord(row: MonthlyRecord) {
    return this.http.delete(`${this.url}/records/${row.id}`, {
      params: { rowVersion: row.rowVersion },
    });
  }
}
