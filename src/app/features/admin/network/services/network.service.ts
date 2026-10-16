import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  LOCATION_LEVELS,
  NETWORK_CATALOGS,
  NetworkPage,
  NetworkQuery,
  NetworkRecord,
  NetworkResource,
} from '../network.models';

@Injectable({ providedIn: 'root' })
export class NetworkService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/NetworkConfiguration`;

  list(resource: NetworkResource, query: NetworkQuery = {}) {
    let params = new HttpParams()
      .set('Page', query.page ?? 1)
      .set('PageSize', 20)
      .set('Search', query.search?.trim() ?? '')
      .set('IncludeInactive', query.includeInactive ?? false);
    if (query.parentId) params = params.set('ParentId', query.parentId);
    return this.http.get<NetworkPage>(`${this.base}/${resource}`, { params });
  }

  detail(resource: NetworkResource, id: number) {
    return this.http
      .get<{ data: NetworkRecord }>(`${this.base}/${resource}/${id}`)
      .pipe(map((response) => response.data));
  }

  /** Resolve only the selected ancestor chain, rather than downloading entire catalogs. */
  ancestors(
    resource: NetworkResource,
    parentId: number | null | undefined,
  ): Observable<NetworkRecord[]> {
    const depth = NETWORK_CATALOGS.find((catalog) => catalog.resource === resource)!.locationDepth;
    if (!depth || !parentId) return of([]);
    const parentResource = LOCATION_LEVELS[depth - 1].resource;
    return this.detail(parentResource, parentId).pipe(
      switchMap((parent) =>
        this.ancestors(parentResource, parent.parentId).pipe(
          map((ancestors) => [...ancestors, parent]),
        ),
      ),
    );
  }

  save(resource: NetworkResource, id: number | null, body: object) {
    const url = this.writeUrl(resource);
    return id === null
      ? this.http.post<unknown>(url, body)
      : this.http.put<unknown>(`${url}/${id}`, body);
  }

  deactivate(resource: NetworkResource, record: NetworkRecord) {
    return this.http.delete<void>(
      `${this.writeUrl(resource)}/${record.id}`,
      resource === 'Ports' ? { body: { rowVersion: record.rowVersion } } : {},
    );
  }

  private writeUrl(resource: NetworkResource) {
    if (resource === 'Countries') throw new Error('Countries are read-only.');
    if (resource === 'Cities') return `${environment.apiUrl}/api/City`;
    if (resource === 'Nodes') return `${environment.apiUrl}/api/Node`;
    return `${this.base}/${resource}`;
  }
}
