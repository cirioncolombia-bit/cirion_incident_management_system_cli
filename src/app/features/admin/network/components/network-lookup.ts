import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { NetworkRecord, NetworkResource, NetworkSelection } from '../network.models';
import { NetworkService } from '../services/network.service';

@Component({
  selector: 'app-network-lookup',
  template: `
    <label [for]="fieldId()"
      >{{ label() }}
      @if (required()) {
        <span class="required">*</span>
      }
    </label>
    <div class="lookup" [class.invalid]="invalid()">
      <div class="search">
        <input
          type="search"
          [value]="search()"
          maxlength="200"
          [disabled]="disabled()"
          [attr.aria-label]="'Search ' + label()"
          placeholder="Search by name"
          (input)="search.set($any($event.target).value)"
          (keydown.enter)="$event.preventDefault(); applySearch()"
        />
        <button type="button" (click)="applySearch()" [disabled]="disabled() || busy()">
          Search
        </button>
      </div>
      <select
        [id]="fieldId()"
        [disabled]="disabled() || busy()"
        [attr.aria-required]="required()"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="fieldId() + '-feedback'"
        (change)="choose($any($event.target).value)"
      >
        <option value="" [selected]="!selected()">
          {{ required() ? 'Select an option' : emptyLabel() }}
        </option>
        @if (selected() && !selectedOnPage()) {
          <option [value]="selected()!.id" [selected]="true">
            {{ selected()!.name
            }}{{ selected()!.parentName ? ' · ' + selected()!.parentName : '' }} (current selection)
          </option>
        }
        @for (record of rows(); track record.id) {
          <option [value]="record.id" [selected]="record.id === selected()?.id">
            {{ record.name }}{{ record.parentName ? ' · ' + record.parentName : '' }}
          </option>
        }
      </select>
      <div [id]="fieldId() + '-feedback'" class="feedback">
        @if (busy()) {
          <span role="status">Loading options…</span>
        } @else if (error()) {
          <span role="alert"
            >{{ error() }} <button type="button" (click)="load()">Retry</button></span
          >
        } @else if (!disabled() && rows().length === 0) {
          <span>No active options match this search.</span>
        }
        @if (invalid()) {
          <span class="required" role="alert">Select {{ label().toLowerCase() }}.</span>
        }
      </div>
      @if (pages() > 1) {
        <div class="pagination">
          <button
            type="button"
            [disabled]="busy() || page() <= 1"
            (click)="paginate(-1)"
            [attr.aria-label]="'Previous ' + label() + ' options'"
          >
            Previous
          </button>
          <span>{{ page() }} / {{ pages() }}</span>
          <button
            type="button"
            [disabled]="busy() || page() >= pages()"
            (click)="paginate(1)"
            [attr.aria-label]="'Next ' + label() + ' options'"
          >
            Next
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    * {
      box-sizing: border-box;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.4rem;
    }
    .lookup {
      padding: 0.65rem;
      border: 1px solid #d7e1ef;
      border-radius: 0.65rem;
      min-width: 0;
      background: #fff;
    }
    .search {
      display: flex;
      gap: 0.4rem;
      margin-bottom: 0.5rem;
      min-width: 0;
    }
    input,
    select,
    button {
      font: inherit;
      min-height: 44px;
      border: 1px solid #c7d5e7;
      border-radius: 0.4rem;
      padding: 0.5rem;
      color: #12365b;
      background: #fff;
    }
    input {
      flex: 1;
      width: 0;
      min-width: 0;
    }
    select {
      width: 100%;
      min-width: 0;
      max-width: 100%;
    }
    button {
      cursor: pointer;
      background: #edf4fc;
    }
    button:disabled {
      opacity: 0.55;
      cursor: default;
    }
    :focus-visible {
      outline: 3px solid #478bf4;
      outline-offset: 2px;
    }
    .feedback {
      display: grid;
      gap: 0.3rem;
      font-size: 0.8rem;
      margin-top: 0.4rem;
      overflow-wrap: anywhere;
    }
    .pagination {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.4rem;
      margin-top: 0.5rem;
    }
    .invalid {
      border-color: #b91c1c;
    }
    .required {
      color: #b91c1c;
    }
  `,
})
export class NetworkLookup {
  private readonly api = inject(NetworkService);
  private readonly destroy = inject(DestroyRef);
  readonly resource = input.required<NetworkResource>();
  readonly label = input.required<string>();
  readonly fieldId = input.required<string>();
  readonly parentId = input<number | null>(null);
  readonly disabled = input(false);
  readonly required = input(false);
  readonly emptyLabel = input('Not assigned');
  readonly invalid = input(false);
  readonly selected = input<NetworkSelection | null>(null);
  readonly selectionChange = output<NetworkRecord | null>();
  readonly search = signal('');
  readonly rows = signal<NetworkRecord[]>([]);
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly selectedOnPage = computed(() =>
    this.rows().some((row) => row.id === this.selected()?.id),
  );
  private version = 0;

  constructor() {
    effect(() => {
      const resource = this.resource(),
        parent = this.parentId(),
        disabled = this.disabled();
      // Only input dependencies should trigger a reset, not state read while loading.
      this.reset(resource, parent, disabled);
    });
  }

  private reset(resource: NetworkResource, parentId: number | null, disabled: boolean) {
    this.version++;
    this.search.set('');
    this.rows.set([]);
    this.page.set(1);
    this.pages.set(0);
    this.error.set('');
    this.busy.set(false);
    if (!disabled) this.request(resource, parentId, 1, '');
  }
  applySearch() {
    this.page.set(1);
    this.load();
  }
  paginate(delta: number) {
    this.page.update((page) => page + delta);
    this.load();
  }
  load() {
    if (!this.disabled())
      this.request(this.resource(), this.parentId(), this.page(), this.search());
  }
  private request(
    resource: NetworkResource,
    parentId: number | null,
    page: number,
    search: string,
  ) {
    const version = ++this.version;
    this.busy.set(true);
    this.error.set('');
    this.api
      .list(resource, { parentId, page, search })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (version === this.version) this.busy.set(false);
        }),
      )
      .subscribe({
        next: (result) => {
          if (version === this.version) {
            this.rows.set(result.rows);
            this.pages.set(result.totalPages);
          }
        },
        error: () => {
          if (version === this.version) {
            this.rows.set([]);
            this.error.set('Options could not be loaded.');
          }
        },
      });
  }
  choose(value: string) {
    const record = this.rows().find((row) => row.id === Number(value));
    if (!record && Number(value) === this.selected()?.id) return;
    this.selectionChange.emit(record ?? null);
  }
}
