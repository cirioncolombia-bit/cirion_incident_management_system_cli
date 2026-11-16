import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Indicator, Page, requestError } from '../models/indicators';
import { IndicatorsService } from '../services/indicators.service';
@Component({
  selector: 'app-indicator-picker',
  imports: [ReactiveFormsModule],
  template: ` <div class="picker">
    <label
      >Buscar indicador
      <span class="search"
        ><input
          type="search"
          aria-label="Buscar indicador"
          [formControl]="search"
          maxlength="200"
          (keydown.enter)="$event.preventDefault(); load(1)"
          placeholder="Nombre del indicador"
        /><button type="button" (click)="load(1)" [disabled]="disabled()">Buscar</button></span
      >
    </label>
    <label
      >Indicador
      <select
        aria-label="Indicador"
        [value]="selected()?.id ?? ''"
        [disabled]="disabled() || loading()"
        (change)="choose($event)"
      >
        <option value="">
          {{ allowAll() ? 'Todos los indicadores' : 'Selecciona un indicador' }}
        </option>
        @if (selected() && !inPage()) {
          <option [value]="selected()!.id" [disabled]="!includeInactive() && !selected()!.isActive">
            {{ selected()!.name }}{{ selected()!.isActive ? '' : ' (Inactivo)' }}
          </option>
        }
        @for (item of result()?.rows ?? []; track item.id) {
          <option [value]="item.id">{{ item.name }}{{ item.isActive ? '' : ' (Inactivo)' }}</option>
        }
      </select>
    </label>
    @if (loading()) {
      <small role="status">Cargando indicadores…</small>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @if (result(); as page) {
      @if (page.totalPages > 1) {
        <div class="pages">
          <button
            type="button"
            [disabled]="disabled() || loading() || page.page <= 1"
            (click)="load(page.page - 1)"
          >
            Anterior</button
          ><small>Página {{ page.page }} de {{ page.totalPages }}</small
          ><button
            type="button"
            [disabled]="disabled() || loading() || page.page >= page.totalPages"
            (click)="load(page.page + 1)"
          >
            Siguiente
          </button>
        </div>
      }
    }
  </div>`,
  styles: `
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
export class IndicatorPicker {
  private readonly api = inject(IndicatorsService);
  readonly includeInactive = input(false);
  readonly allowAll = input(false);
  readonly disabled = input(false);
  readonly selected = input<Indicator | null>(null);
  readonly selectedChange = output<Indicator | null>();
  readonly search = new FormControl('', { nonNullable: true });
  readonly result = signal<Page<Indicator> | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);
  private appliedSearch = '';
  private readonly requests = new Subject<{
    page: number;
    includeInactive: boolean;
    search: string;
  }>();
  constructor() {
    this.requests
      .pipe(
        switchMap((query) =>
          this.api.list({ ...query, pageSize: 20 }).pipe(
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
      this.includeInactive();
      this.load(1);
    });
  }
  inPage() {
    return this.result()?.rows.some((x) => x.id === this.selected()?.id) ?? false;
  }
  load(page: number) {
    if (this.disabled()) return;
    if (page === 1) this.appliedSearch = this.search.value.trim();
    this.loading.set(true);
    this.error.set('');
    this.requests.next({
      page,
      search: this.appliedSearch,
      includeInactive: this.includeInactive(),
    });
  }
  choose(event: Event) {
    if (this.disabled()) return;
    const id = Number((event.target as HTMLSelectElement).value);
    this.selectedChange.emit(
      this.result()?.rows.find((x) => x.id === id) ??
        (this.selected()?.id === id ? this.selected() : null),
    );
  }
}
