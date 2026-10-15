import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import {
  Assignment,
  AssignmentWrite,
  AssignmentsService,
  DeliveryLookup,
  Option,
  PortOption,
} from '../../services/assignments.service';
@Component({
  selector: 'app-assignments',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './assignments.html',
  styleUrl: './assignments.scss',
})
export class Assignments {
  private readonly api = inject(AssignmentsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  @ViewChild('confirmation') confirmation!: ElementRef<HTMLDialogElement>;
  readonly canRead = signal(false);
  readonly canWrite = signal(false);
  readonly checking = signal(true);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly lookupBusy = signal(false);
  readonly portsBusy = signal(false);
  readonly error = signal('');
  readonly lookupError = signal('');
  readonly portError = signal('');
  readonly notice = signal('');
  readonly mode = signal<'list' | 'form' | 'detail'>('list');
  readonly id = signal<number | null>(null);
  readonly rows = signal<Assignment[]>([]);
  readonly detail = signal<Assignment | null>(null);
  readonly delivery = signal<DeliveryLookup | null>(null);
  readonly statuses = signal<Option[]>([]);
  readonly fiberTrays = signal<Option[]>([]);
  readonly traysBusy = signal(false);
  readonly trayError = signal('');
  private traysVersion = 0;
  readonly statusFilter = this.fb.nonNullable.control('');
  readonly ports = signal<PortOption[]>([]);
  readonly selectedPort = signal<PortOption | null>(null);
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly total = signal(0);
  readonly portPage = signal(1);
  readonly portPages = signal(0);
  readonly selectedGco = signal<number | null>(null);
  private optionsLoading = false;
  private routeVersion = 0;
  private lookupVersion = 0;
  private portsVersion = 0;
  readonly filters = this.fb.nonNullable.group({ search: ['', Validators.maxLength(200)] });
  readonly form = this.fb.nonNullable.group({
    deliveryId: ['', [Validators.required, Validators.pattern(/^[1-9]\d*$/)]],
    gcoId: ['', Validators.required],
    fiberTrayId: ['', Validators.required],
    statusId: ['', Validators.required],
    equipmentName: ['', Validators.maxLength(100)],
  });
  readonly portFilter = this.fb.nonNullable.control('', Validators.maxLength(200));
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((p) => {
      this.routeVersion++;
      this.lookupVersion++;
      this.portsVersion++;
      this.lookupBusy.set(false);
      this.portsBusy.set(false);
      this.loading.set(false);
      this.error.set('');
      this.lookupError.set('');
      this.portError.set('');
      this.delivery.set(null);
      this.detail.set(null);
      this.selectedPort.set(null);
      this.ports.set([]);
      this.clearTrays();
      this.form.reset();
      const raw = p.get('id'),
        id = raw === null ? null : Number(raw);
      this.id.set(id);
      if (id !== null && (!Number.isSafeInteger(id) || id <= 0)) {
        this.error.set('El identificador de la asignación no es válido.');
        this.mode.set('detail');
        return;
      }
      this.mode.set(
        p.has('new') ? 'form' : id !== null ? (p.has('edit') ? 'form' : 'detail') : 'list',
      );
      if (this.canRead()) this.reload();
    });
    this.loadAccess();
  }
  private loadAccess() {
    this.api
      .me()
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.checking.set(false)),
      )
      .subscribe({
        next: (me) => {
          this.canRead.set(me.permissions.includes('assignments.read'));
          this.canWrite.set(me.permissions.includes('assignments.write'));
          if (this.canRead()) {
            this.reload();
          }
        },
        error: (e) => this.error.set(this.message(e)),
      });
  }
  loadOptions() {
    if (this.optionsLoading) return;
    this.optionsLoading = true;
    this.api
      .options()
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => (this.optionsLoading = false)),
      )
      .subscribe({
        next: (o) => this.statuses.set(o.statuses),
        error: (e) => this.error.set(this.message(e)),
      });
  }
  go(params: Params = {}) {
    if (!this.saving())
      void this.router
        .navigate([], { relativeTo: this.route, queryParams: params })
        .catch(() => this.error.set('No se pudo cambiar de pantalla.'));
  }
  reload() {
    if (!this.canRead()) {
      this.loadAccess();
      return;
    }
    const id = this.id();
    if (id !== null && (!Number.isSafeInteger(id) || id <= 0)) return;
    this.error.set('');
    if (this.statuses().length === 0) this.loadOptions();
    if (id !== null) this.loadDetail(id);
    else if (this.mode() === 'list') this.loadList();
    else if (this.delivery() && this.form.controls.gcoId.value) {
      this.selectedPort.set(null);
      this.form.patchValue({ statusId: '', equipmentName: '' });
      this.loadPorts();
    } else if (this.form.controls.deliveryId.valid) this.lookup();
  }
  loadList() {
    const v = this.routeVersion;
    this.loading.set(true);
    this.api
      .list(this.page(), this.filters.controls.search.value.trim())
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (v === this.routeVersion) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (p) => {
          if (v !== this.routeVersion) return;
          this.rows.set(p.rows);
          this.totalPages.set(p.totalPages);
          this.total.set(p.totalCount);
          if (p.totalPages > 0 && this.page() > p.totalPages) {
            this.page.set(p.totalPages);
            this.loadList();
          }
        },
        error: (e) => {
          if (v === this.routeVersion) this.error.set(this.message(e));
        },
      });
  }
  search() {
    if (this.filters.invalid || this.loading()) return;
    this.page.set(1);
    this.error.set('');
    this.loadList();
  }
  paginate(n: number) {
    this.page.update((p) => p + n);
    this.loadList();
  }
  private loadDetail(id: number) {
    const v = this.routeVersion;
    this.loading.set(true);
    this.api
      .detail(id)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (v === this.routeVersion) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (a) => {
          if (v !== this.routeVersion) return;
          this.detail.set(a);
          if (this.mode() === 'form' && a.deliveryId !== null) {
            this.form.controls.deliveryId.setValue(String(a.deliveryId));
            this.lookup(a);
          }
        },
        error: (e) => {
          if (v === this.routeVersion) this.error.set(this.message(e));
        },
      });
  }
  deliveryChanged() {
    this.lookupError.set('');
    this.lookupVersion++;
    this.portsVersion++;
    this.lookupBusy.set(false);
    this.portsBusy.set(false);
    this.delivery.set(null);
    this.selectedPort.set(null);
    this.ports.set([]);
    this.clearTrays();
    this.form.patchValue({ gcoId: '', fiberTrayId: '', statusId: '', equipmentName: '' });
  }
  lookup(existing?: Assignment) {
    if (this.saving() || this.form.controls.deliveryId.invalid) {
      this.form.controls.deliveryId.markAsTouched();
      return;
    }
    const id = Number(this.form.controls.deliveryId.value);
    if (!Number.isSafeInteger(id)) {
      this.lookupError.set('Ingresa un ID válido.');
      return;
    }
    this.deliveryChanged();
    const v = ++this.lookupVersion;
    this.lookupBusy.set(true);
    this.lookupError.set('');
    this.api
      .delivery(id)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (v === this.lookupVersion) this.lookupBusy.set(false);
        }),
      )
      .subscribe({
        next: (d) => {
          if (v !== this.lookupVersion) return;
          this.delivery.set(d);
          if (existing && existing.deliveryId === d.id) {
            this.form.controls.gcoId.setValue(String(existing.gcoId));
            this.selectedGco.set(existing.gcoId);
            this.loadTrays(existing.port);
          }
        },
        error: (e) => {
          if (v === this.lookupVersion) this.lookupError.set(this.message(e));
        },
      });
  }
  private clearTrays() {
    this.traysVersion++;
    this.traysBusy.set(false);
    this.fiberTrays.set([]);
    this.trayError.set('');
    this.statusFilter.reset();
  }
  private clearPorts() {
    this.portsVersion++;
    this.portsBusy.set(false);
    this.selectedPort.set(null);
    this.ports.set([]);
    this.portPages.set(0);
    this.portError.set('');
    this.form.patchValue({ statusId: '', equipmentName: '' });
    this.portPage.set(1);
  }
  loadTrays(existing?: PortOption) {
    const d = this.delivery(),
      gco = Number(this.form.controls.gcoId.value);
    if (!d || !gco) return;
    const v = ++this.traysVersion;
    this.traysBusy.set(true);
    this.trayError.set('');
    this.api
      .fiberTrays(d.id, gco)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (v === this.traysVersion) this.traysBusy.set(false);
        }),
      )
      .subscribe({
        next: (trays) => {
          if (v !== this.traysVersion) return;
          this.fiberTrays.set(trays);
          if (existing && trays.some((t) => t.id === existing.fiberTrayId)) {
            this.form.controls.fiberTrayId.setValue(String(existing.fiberTrayId));
            this.selectPort(existing);
            this.loadPorts();
          }
        },
        error: (e) => {
          if (v === this.traysVersion) this.trayError.set(this.message(e));
        },
      });
  }
  trayChanged() {
    this.clearPorts();
    this.statusFilter.reset();
    this.portFilter.reset();
    this.loadPorts();
  }
  statusChanged() {
    this.clearPorts();
    this.loadPorts();
  }
  gcoChanged() {
    this.clearTrays();
    this.clearPorts();
    this.form.controls.fiberTrayId.reset();
    this.selectedGco.set(Number(this.form.controls.gcoId.value) || null);
    this.portFilter.reset();
    if (this.selectedGco()) this.loadTrays();
  }
  loadPorts() {
    const d = this.delivery(),
      gco = Number(this.form.controls.gcoId.value);
    const tray = Number(this.form.controls.fiberTrayId.value);
    if (!d || !gco || !tray) return;
    const v = ++this.portsVersion;
    this.portsBusy.set(true);
    this.portError.set('');
    this.api
      .ports(
        d.id,
        gco,
        this.portPage(),
        this.portFilter.value.trim(),
        tray,
        Number(this.statusFilter.value) || undefined,
      )
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (v === this.portsVersion) this.portsBusy.set(false);
        }),
      )
      .subscribe({
        next: (p) => {
          if (v !== this.portsVersion) return;
          this.ports.set(p.rows);
          this.portPages.set(p.totalPages);
        },
        error: (e) => {
          if (v === this.portsVersion) this.portError.set(this.message(e));
        },
      });
  }
  searchPorts() {
    if (this.portFilter.invalid) return;
    this.portPage.set(1);
    this.loadPorts();
  }
  paginatePorts(n: number) {
    this.portPage.update((p) => p + n);
    this.loadPorts();
  }
  selectPort(port: PortOption) {
    this.selectedPort.set(port);
    this.form.patchValue({
      statusId: String(port.statusId),
      equipmentName: port.equipmentName ?? '',
    });
  }
  hasStatus(id: number) {
    return this.statuses().some((s) => s.id === id);
  }
  save() {
    if (
      this.saving() ||
      this.loading() ||
      this.lookupBusy() ||
      this.portsBusy() ||
      this.traysBusy() ||
      !this.canWrite()
    )
      return;
    this.form.markAllAsTouched();
    this.error.set('');
    const d = this.delivery(),
      port = this.selectedPort();
    const value = this.form.getRawValue();
    if (
      this.form.invalid ||
      !d ||
      d.id !== Number(value.deliveryId) ||
      !port ||
      port.gcoId !== Number(value.gcoId) ||
      port.fiberTrayId !== Number(value.fiberTrayId)
    ) {
      this.error.set(
        'Consulta un Delivery y selecciona GCO, FiberTray, puerto y estado antes de guardar.',
      );
      return;
    }
    const body: AssignmentWrite = {
      deliveryId: d.id,
      portId: port.id,
      statusId: Number(value.statusId),
      equipmentName: value.equipmentName.trim() || null,
      portVersion: port.rowVersion,
    };
    if (this.id() !== null) {
      if (!this.detail()) return;
      body.rowVersion = this.detail()!.rowVersion;
    }
    this.saving.set(true);
    this.api
      .save(this.id(), body)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (id) => {
          this.notice.set('La asignación se guardó correctamente.');
          void this.router
            .navigate([], { relativeTo: this.route, queryParams: { id } })
            .then((ok) => {
              if (!ok) {
                this.mode.set('detail');
                this.id.set(id);
                this.loadDetail(id);
              }
            })
            .catch(() => {
              this.mode.set('detail');
              this.id.set(id);
              this.loadDetail(id);
            });
        },
        error: (e) => this.error.set(this.message(e)),
      });
  }
  confirmDelete() {
    if (this.detail() && this.canWrite()) this.confirmation.nativeElement.showModal();
  }
  cancelDelete() {
    if (!this.saving()) this.confirmation.nativeElement.close();
  }
  deactivate() {
    const a = this.detail();
    if (!a || this.saving() || !this.canWrite()) return;
    this.saving.set(true);
    this.error.set('');
    this.api
      .deactivate(a.id, a.rowVersion)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.confirmation.nativeElement.close();
          this.notice.set('La asignación se desactivó correctamente.');
          void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
        },
        error: (e) => this.error.set(this.message(e)),
      });
  }
  private message(e: unknown) {
    if (!(e instanceof HttpErrorResponse)) return 'No se pudo completar la operación.';
    if (e.status === 0) return 'No se pudo conectar con el servidor.';
    if (e.status === 403) return 'No tienes permiso para esta operación.';
    if (e.status === 404) return 'No se encontró el registro o no está disponible para tu cuenta.';
    if (e.status === 409)
      return 'El registro cambió o el nombre del equipo está reservado. Actualiza la información antes de reintentar.';
    if (e.status === 400)
      return (
        e.error?.message ||
        Object.values(e.error?.errors ?? {})
          .flat()
          .join(' ') ||
        'Revisa los datos del formulario.'
      );
    return 'No se pudo completar la operación. Inténtalo nuevamente.';
  }
}
