import {
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { NetworkLookup } from './components/network-lookup';
import { NetworkService } from './services/network.service';
import {
  LOCATION_LEVELS,
  NETWORK_CATALOGS,
  PORT_REFERENCES,
  LocationField,
  ReferenceField,
  NetworkRecord,
  NetworkSelection,
} from './network.models';

const positiveId = [
  Validators.required,
  Validators.pattern(/^[1-9]\d*$/),
  Validators.max(2147483647),
];

@Component({
  selector: 'app-network-administration',
  imports: [ReactiveFormsModule, NetworkLookup],
  templateUrl: './network.html',
  styleUrl: './network.scss',
})
export class NetworkAdministration {
  private readonly api = inject(NetworkService);
  private readonly auth = inject(AuthService);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  @ViewChild('editor') editor!: ElementRef<HTMLDialogElement>;
  @ViewChild('confirmation') confirmation!: ElementRef<HTMLDialogElement>;
  readonly catalogs = NETWORK_CATALOGS;
  readonly references = PORT_REFERENCES;
  readonly catalog = signal(NETWORK_CATALOGS[0]);
  readonly locationLevels = computed(() => LOCATION_LEVELS.slice(0, this.catalog().locationDepth));
  readonly parentLevel = computed(() => this.locationLevels().at(-1));
  readonly canRead = signal(false);
  readonly canManage = signal(false);
  readonly checking = signal(true);
  readonly loading = signal(false);
  readonly preparing = signal(false);
  readonly formReady = signal(false);
  readonly editorTarget = signal<NetworkRecord | undefined>(undefined);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly deletionError = signal('');
  readonly notice = signal('');
  readonly rows = signal<NetworkRecord[]>([]);
  readonly page = signal(1);
  readonly pages = signal(0);
  readonly total = signal(0);
  readonly filterParent = signal<NetworkSelection | null>(null);
  readonly editing = signal<NetworkRecord | null>(null);
  readonly deletion = signal<NetworkRecord | null>(null);
  readonly selections = signal<Partial<Record<LocationField | ReferenceField, NetworkSelection>>>(
    {},
  );
  readonly filters = this.fb.nonNullable.group({
    search: ['', Validators.maxLength(200)],
    includeInactive: false,
  });
  readonly form = this.fb.nonNullable.group({
    name: '',
    address: '',
    distanceToPort: '0',
    portNumber: '',
    countryId: '',
    cityId: '',
    nodeId: '',
    gcoId: '',
    fiberTrayId: '',
    portNumberId: '',
    statusId: '',
    equipmentId: '',
    conduitId: '',
    fiberColorId: '',
  });
  private listVersion = 0;
  private editorVersion = 0;

  constructor() {
    this.loadSession();
  }

  loadSession() {
    this.checking.set(true);
    this.error.set('');
    this.auth
      .loadCurrentUser()
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.checking.set(false)),
      )
      .subscribe({
        next: (user) => {
          this.canRead.set(!user.isExternal && user.permissions.includes('catalogs.read'));
          this.canManage.set(!user.isExternal && user.permissions.includes('catalogs.manage'));
          if (this.canRead()) this.reload();
        },
        error: () => this.error.set('Your permissions could not be loaded. Please try again.'),
      });
  }
  changeCatalog(resource: string) {
    const catalog = this.catalogs.find((item) => item.resource === resource);
    if (!catalog || this.saving()) return;
    this.catalog.set(catalog);
    this.filters.reset();
    this.filterParent.set(null);
    this.page.set(1);
    this.rows.set([]);
    this.notice.set('');
    this.reload();
  }
  search() {
    if (this.filters.valid) {
      this.page.set(1);
      this.reload();
    }
  }
  changeParent(parent: NetworkSelection | null) {
    this.filterParent.set(parent);
    this.search();
  }
  paginate(delta: number) {
    this.page.update((page) => page + delta);
    this.reload();
  }
  reload() {
    if (!this.canRead()) return;
    const version = ++this.listVersion;
    this.loading.set(true);
    this.error.set('');
    this.api
      .list(this.catalog().resource, {
        ...this.filters.getRawValue(),
        page: this.page(),
        parentId: this.filterParent()?.id,
      })
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (version === this.listVersion) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (result) => {
          if (version === this.listVersion) {
            this.rows.set(result.rows);
            this.pages.set(result.totalPages);
            this.total.set(result.totalCount);
          }
        },
        error: (error) => {
          if (version === this.listVersion) {
            this.rows.set([]);
            this.error.set(this.message(error));
          }
        },
      });
  }

  openEditor(record?: NetworkRecord) {
    if (
      !this.canRead() ||
      !this.canManage() ||
      this.catalog().resource === 'Countries' ||
      record?.isActive === false ||
      this.saving()
    )
      return;
    const version = ++this.editorVersion;
    const resource = this.catalog().resource;
    this.editing.set(null);
    this.editorTarget.set(record);
    this.formReady.set(false);
    this.formError.set('');
    this.preparing.set(true);
    this.form.reset();
    this.selections.set({});
    this.editor.nativeElement.showModal();
    const request: Observable<NetworkRecord | null> = record
      ? this.api.detail(resource, record.id)
      : of(null);
    request
      .pipe(
        switchMap((detail) =>
          this.api
            .ancestors(resource, detail?.parentId)
            .pipe(map((ancestors) => ({ detail, ancestors }))),
        ),
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (version === this.editorVersion) this.preparing.set(false);
        }),
      )
      .subscribe({
        next: ({ detail, ancestors }) => {
          if (version !== this.editorVersion) return;
          if (detail && !detail.isActive) {
            this.formError.set('This record is inactive. Refresh the list before continuing.');
            return;
          }
          this.editing.set(detail);
          this.prepareForm(detail, ancestors);
          this.formReady.set(true);
        },
        error: (error) => {
          if (version === this.editorVersion) this.formError.set(this.message(error));
        },
      });
  }

  private prepareForm(record: NetworkRecord | null, ancestors: NetworkRecord[]) {
    for (const control of Object.values(this.form.controls)) control.clearValidators();
    this.form.reset({
      name: record?.name ?? '',
      address: record?.address ?? '',
      distanceToPort: String(record?.distanceToPort ?? 0),
      portNumber: String(record?.portNumber ?? ''),
    });
    const selections: Partial<Record<LocationField | ReferenceField, NetworkSelection>> = {};
    for (const [index, ancestor] of ancestors.entries()) {
      const field = LOCATION_LEVELS[index].field;
      this.form.controls[field].setValue(String(ancestor.id));
      selections[field] = ancestor;
    }
    for (const level of this.locationLevels())
      this.form.controls[level.field].setValidators(positiveId);
    if (this.catalog().maxName)
      this.form.controls.name.setValidators([
        Validators.required,
        Validators.maxLength(this.catalog().maxName),
        (control) => (control.value?.trim() ? null : { required: true }),
      ]);
    if (this.catalog().resource === 'Nodes')
      this.form.controls.address.setValidators([
        Validators.required,
        Validators.maxLength(200),
        (control) => (control.value?.trim() ? null : { required: true }),
      ]);
    if (this.catalog().resource === 'Gcos')
      this.form.controls.distanceToPort.setValidators([
        Validators.required,
        Validators.min(0),
        (control) => (Number.isFinite(Number(control.value)) ? null : { finite: true }),
      ]);
    if (this.catalog().resource === 'PortNumbers')
      this.form.controls.portNumber.setValidators(positiveId);
    if (this.catalog().resource === 'Ports') {
      for (const reference of this.references) {
        const id = record?.[reference.field];
        if (id) {
          this.form.controls[reference.field].setValue(String(id));
          const name =
            reference.field === 'portNumberId'
              ? String(record?.portNumber ?? id)
              : record?.[reference.field.replace('Id', 'Name') as keyof NetworkRecord];
          selections[reference.field] = { id, name: String(name ?? `#${id}`) };
        }
        if (reference.required) this.form.controls[reference.field].setValidators(positiveId);
      }
    }
    this.selections.set(selections);
    this.updateEquipmentValidation();
    for (const control of Object.values(this.form.controls))
      control.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity();
  }

  chooseLocation(field: LocationField, record: NetworkRecord | null) {
    const index = LOCATION_LEVELS.findIndex((level) => level.field === field);
    const selections = { ...this.selections() };
    for (const level of LOCATION_LEVELS.slice(index)) {
      this.form.controls[level.field].reset('');
      delete selections[level.field];
    }
    if (record) selections[field] = record;
    this.form.controls[field].setValue(record ? String(record.id) : '');
    this.selections.set(selections);
  }
  chooseReference(field: ReferenceField, record: NetworkRecord | null) {
    this.form.controls[field].setValue(record ? String(record.id) : '');
    const selections = { ...this.selections() };
    if (record) selections[field] = record;
    else delete selections[field];
    this.selections.set(selections);
    this.updateEquipmentValidation();
  }
  equipmentRequired() {
    return this.selections().statusId?.name.trim().toUpperCase() === 'OCUPADO';
  }
  private updateEquipmentValidation() {
    this.form.controls.equipmentId.setValidators(
      this.catalog().resource === 'Ports' && this.equipmentRequired() ? positiveId : [],
    );
    this.form.controls.equipmentId.updateValueAndValidity();
  }
  locationId(field: LocationField) {
    return Number(this.form.controls[field].value) || null;
  }
  invalid(field: keyof typeof this.form.controls) {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }
  cancelEditor() {
    if (!this.saving()) {
      this.editorVersion++;
      this.preparing.set(false);
      this.editor.nativeElement.close();
    }
  }

  save() {
    if (
      !this.canRead() ||
      !this.canManage() ||
      this.saving() ||
      this.preparing() ||
      !this.formReady() ||
      this.catalog().resource === 'Countries'
    )
      return;
    this.form.markAllAsTouched();
    this.formError.set('');
    if (this.form.invalid) {
      this.formError.set('Complete the required fields and correct the highlighted values.');
      return;
    }
    const record = this.editing();
    if (record && !record.isActive) return;
    if (this.catalog().resource === 'Ports' && record && !record.rowVersion) {
      this.formError.set('Reload the port before editing it.');
      return;
    }
    this.saving.set(true);
    this.api
      .save(this.catalog().resource, record?.id ?? null, this.body())
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.editor.nativeElement.close();
          this.notice.set('The record was saved successfully.');
          this.reload();
        },
        error: (error) => this.formError.set(this.message(error)),
      });
  }
  private body(): object {
    const value = this.form.getRawValue();
    const name = value.name.trim();
    switch (this.catalog().resource) {
      case 'Cities':
        return { cityName: name, countryId: Number(value.countryId) };
      case 'Nodes':
        return { nodeName: name, address: value.address.trim(), cityId: Number(value.cityId) };
      case 'Gcos':
        return { name, nodeId: Number(value.nodeId), distanceToPort: Number(value.distanceToPort) };
      case 'FiberTrays':
        return { name, gcoId: Number(value.gcoId) };
      case 'PortNumbers':
        return { portNumber: Number(value.portNumber) };
      case 'Ports':
        return {
          fiberTrayId: Number(value.fiberTrayId),
          portNumberId: Number(value.portNumberId),
          statusId: Number(value.statusId),
          equipmentId: Number(value.equipmentId) || null,
          conduitId: Number(value.conduitId) || null,
          fiberColorId: Number(value.fiberColorId) || null,
          ...(this.editing() ? { rowVersion: this.editing()!.rowVersion } : {}),
        };
      default:
        return { name };
    }
  }

  confirmDeactivation(record: NetworkRecord) {
    if (
      !this.canRead() ||
      !this.canManage() ||
      !record.isActive ||
      this.catalog().resource === 'Countries' ||
      this.saving()
    )
      return;
    this.deletion.set(record);
    this.deletionError.set('');
    this.confirmation.nativeElement.showModal();
  }
  cancelDeactivation() {
    if (!this.saving()) {
      this.deletion.set(null);
      this.confirmation.nativeElement.close();
    }
  }
  deactivate() {
    const record = this.deletion();
    if (!record || !this.canManage() || !this.canRead() || this.saving()) return;
    if (this.catalog().resource === 'Ports' && !record.rowVersion) {
      this.deletionError.set('Refresh the list before deactivating this port.');
      return;
    }
    this.saving.set(true);
    this.deletionError.set('');
    this.api
      .deactivate(this.catalog().resource, record)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.confirmation.nativeElement.close();
          this.deletion.set(null);
          this.notice.set('The record was deactivated. Its history has been preserved.');
          if (this.rows().length === 1 && this.page() > 1) this.page.update((page) => page - 1);
          this.reload();
        },
        error: (error) => this.deletionError.set(this.message(error)),
      });
  }
  private message(error: unknown) {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) return 'You do not have permission to perform this action.';
      if (error.status === 404) return 'The record is no longer available. Refresh and try again.';
      if (error.status === 400 || error.status === 409) {
        const message = error.error?.message;
        if (typeof message === 'string' && message) return message;
        return error.status === 409
          ? 'The record changed or has dependent records. Refresh and review its relationships.'
          : 'Check the selected values and try again.';
      }
    }
    return 'The request could not be completed. Please try again.';
  }
}
