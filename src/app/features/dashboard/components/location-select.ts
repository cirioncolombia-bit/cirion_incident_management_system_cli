import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LocationOption, Page, requestError } from '../models/indicators';
import { IndicatorsService } from '../services/indicators.service';
@Component({
  selector: 'app-location-select',
  imports: [ReactiveFormsModule],
  template: ` <div class="picker">
    @if (showSearch()) {
      <label
        >{{ kind() === 'cities' ? 'Buscar ciudad' : 'Buscar nodo' }}
        <span class="search"
          ><input
            type="search"
            [attr.aria-label]="kind() === 'cities' ? 'Buscar ciudad' : 'Buscar nodo'"
            [formControl]="search"
            maxlength="200"
            (keydown.enter)="$event.preventDefault(); load(1)"
            placeholder="Nombre de la ubicación"
          /><button class="cims-filter-action"
            type="button"
            (click)="load(1)"
            [disabled]="disabled() || (kind() === 'nodes' && !parentCityId())"
          >
            Buscar
          </button></span
        >
      </label>
    }
    <label
      >{{ kind() === 'cities' ? 'Ciudad' : 'Nodo' }}
      <select
        [attr.aria-label]="kind() === 'cities' ? 'Ciudad' : 'Nodo'"
        [value]="selected()?.id ?? ''"
        [disabled]="disabled() || (kind() === 'nodes' && !parentCityId()) || loading()"
        (change)="choose($event)"
      >
        <option value="">
          {{
            allowAll()
              ? kind() === 'cities'
                ? 'Todas las ciudades'
                : 'Todos los nodos'
              : kind() === 'cities'
                ? 'Selecciona una ciudad'
                : 'Selecciona un nodo'
          }}
        </option>
        @if (selected() && !inPage()) {
          <option [value]="selected()!.id">
            {{ selected()!.name }}
          </option>
        }
        @for (item of result()?.rows ?? []; track item.id) {
          <option [value]="item.id">{{ item.name }}</option>
        }
      </select>
    </label>
    @if (loading()) {
      <small role="status">Cargando ubicaciones…</small>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @if (result(); as page) {
      @if (page.totalPages > 1) {
        <div class="pages">
          <button
            type="button"
            [disabled]="
              disabled() || (kind() === 'nodes' && !parentCityId()) || loading() || page.page <= 1
            "
            (click)="load(page.page - 1)"
          >
            Anterior</button
          ><small>Página {{ page.page }} de {{ page.totalPages }}</small
          ><button
            type="button"
            [disabled]="
              disabled() ||
              (kind() === 'nodes' && !parentCityId()) ||
              loading() ||
              page.page >= page.totalPages
            "
            (click)="load(page.page + 1)"
          >
            Siguiente
          </button>
        </div>
      }
    }
  </div>`,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .picker {
      display: grid;
      gap: 0.75rem;
    }
    label {
      display: grid;
      gap: 0.4rem;
    }
    input,
    select,
    button {
      font: inherit;
      min-height: 2.75rem;
      border: 1px solid #cbd8e8;
      border-radius: 0.5rem;
      padding: 0.5rem 0.75rem;
      min-width: 0;
      background: white;
      color: #12365b;
    }
    select {
      height: var(--dashboard-filter-height, auto);
      width: 100%;
    }
    .search,
    .pages {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .search input {
      width: 100%;
      flex: 1;
    }
    .pages {
      flex-wrap: wrap;
    }
    button {
      cursor: pointer;
    }
    button:disabled,
    select:disabled {
      opacity: 0.55;
    }
    p {
      color: #a52332;
      margin: 0;
    }
    small {
      color: #5b708c;
    }
  `,
})
export class LocationSelect {
  private readonly api = inject(IndicatorsService);
  readonly kind = input<'cities' | 'nodes'>('cities');
  readonly parentCityId = input<number | null>(null);
  readonly showSearch = input(true);
  readonly includeInactive = input(false);
  readonly allowAll = input(false);
  readonly disabled = input(false);
  readonly selected = input<LocationOption | null>(null);
  readonly selectedChange = output<LocationOption | null>();
  readonly search = new FormControl('', { nonNullable: true });
  readonly result = signal<Page<LocationOption> | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  private appliedSearch = '';
  private readonly requests = new Subject<null | {
    page: number;
    includeInactive: boolean;
    cityId: number | null;
    search: string;
  }>();
  constructor() {
    this.requests
      .pipe(
        switchMap((query) =>
          query === null
            ? of({ data: null, error: '' })
            : this.api.locations(this.kind(), { ...query, pageSize: 20 }).pipe(
                map((data) => ({ data, error: '' })),
                catchError((error) => of({ data: null, error: requestError(error) })),
              ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(({ data, error }) => {
        this.loading.set(false);
        this.result.set(data);
        this.error.set(error);
      });
    effect(() => {
      const cityId = this.parentCityId();
      this.kind();
      this.includeInactive();
      this.requests.next(null);
      this.result.set(null);
      this.error.set('');
      if (this.kind() === 'nodes' && !cityId) {
        this.loading.set(false);
        return;
      }
      this.load(1);
    });
  }
  inPage() {
    return this.result()?.rows.some((x) => x.id === this.selected()?.id) ?? false;
  }
  load(page: number) {
    if (this.disabled() || (this.kind() === 'nodes' && !this.parentCityId())) return;
    if (page === 1) this.appliedSearch = this.search.value.trim();
    this.loading.set(true);
    this.error.set('');
    this.requests.next({
      page,
      search: this.appliedSearch,
      includeInactive: this.includeInactive(),
      cityId: this.parentCityId(),
    });
  }
  choose(event: Event) {
    if (this.disabled() || (this.kind() === 'nodes' && !this.parentCityId())) return;
    const id = Number((event.target as HTMLSelectElement).value);
    this.selectedChange.emit(
      this.result()?.rows.find((x) => x.id === id) ??
        (this.selected()?.id === id ? this.selected() : null),
    );
  }
}
