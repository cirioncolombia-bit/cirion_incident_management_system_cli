import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import {
  Catalog,
  CurrentUser,
  Options,
  Section,
  UserRecord,
  UsersAdminService,
  UserWrite,
} from './services/users-admin.service';
@Component({
  selector: 'app-users-list',
  imports: [ReactiveFormsModule, DatePipe],
  styleUrl: './users-list.scss',
  templateUrl: './users-list.html',
})
export class UsersList {
  private readonly api = inject(UsersAdminService);
  private readonly destroy = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  @ViewChild('editor') editor!: ElementRef<HTMLDialogElement>;
  @ViewChild('confirmation') confirmation!: ElementRef<HTMLDialogElement>;
  readonly tabs: { key: Section; label: string; description: string }[] = [
    {
      key: 'users',
      label: 'Usuarios',
      description: 'Administra las personas, su compañía y sus roles de acceso.',
    },
    {
      key: 'roles',
      label: 'Roles',
      description: 'Agrupa permisos para asignarlos a los usuarios.',
    },
    {
      key: 'permissions',
      label: 'Permisos',
      description: 'Administra el catálogo de permisos utilizados por la aplicación.',
    },
    {
      key: 'eaims',
      label: 'EAIM',
      description: 'Administra las compañías externas vinculadas a usuarios y deliveries.',
    },
  ];
  readonly section = signal<Section>('users');
  readonly me = signal<CurrentUser | null>(null);
  readonly optionsReady = signal(false);
  readonly formReady = signal(true);
  readonly checking = signal(true);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly notice = signal('');
  readonly users = signal<UserRecord[]>([]);
  readonly catalogs = signal<Catalog[]>([]);
  readonly permissions = signal<Catalog[]>([]);
  readonly options = signal<Options>({ areas: [], roles: [], eaims: [] });
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly total = signal(0);
  readonly selected = signal<UserRecord | null>(null);
  readonly mode = signal<'new' | 'edit' | 'roles' | 'detail'>('new');
  readonly editingId = signal<number | null>(null);
  readonly selectedIds = signal<number[]>([]);
  readonly deletion = signal<{ id: number; name: string } | null>(null);
  readonly filters = this.fb.nonNullable.group({
    search: ['', Validators.maxLength(200)],
    eaimId: '',
    roleId: '',
    userType: '',
    includeInactive: false,
  });
  readonly form = this.fb.nonNullable.group({
    firstName: '',
    secondName: '',
    firstSurname: '',
    secondSurname: '',
    email: '',
    areaId: '',
    eaimId: '',
    userType: '',
    password: '',
    name: '',
    code: '',
    description: '',
  });
  constructor() {
    this.loadSession();
  }
  retry() {
    if (this.me()) this.reload();
    else this.loadSession();
  }
  private loadSession() {
    this.checking.set(true);
    this.error.set('');
    this.api
      .me()
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.checking.set(false)),
      )
      .subscribe({
        next: (me) => {
          this.me.set(me);
          const tab = this.tabs.find((t) => this.allowed(t.key));
          if (tab) {
            this.section.set(tab.key);
            this.reload();
          }
        },
        error: (e) => this.error.set(this.message(e)),
      });
  }
  allowed(section: Section) {
    const me = this.me();
    return (
      !!me &&
      !me.isExternal &&
      me.permissions.includes(section === 'eaims' ? 'catalogs.manage' : 'users.manage')
    );
  }
  title() {
    return this.tabs.find((t) => t.key === this.section())!;
  }
  switchSection(section: Section) {
    if (this.loading() || !this.allowed(section)) return;
    this.section.set(section);
    this.page.set(1);
    this.notice.set('');
    this.reload();
  }
  reload() {
    if (!this.allowed(this.section())) return;
    this.loading.set(true);
    this.error.set('');
    if (this.section() === 'users') {
      this.api
        .users(this.page(), this.filters.getRawValue())
        .pipe(
          takeUntilDestroyed(this.destroy),
          finalize(() => this.loading.set(false)),
        )
        .subscribe({
          next: (r) => {
            this.users.set(r.rows);
            this.total.set(r.totalCount);
            this.totalPages.set(r.totalPages);
            if (r.totalPages > 0 && this.page() > r.totalPages) {
              this.page.set(r.totalPages);
              this.reload();
            }
          },
          error: (e) => this.error.set(this.message(e)),
        });
      this.loadOptions();
    } else
      this.api
        .catalogs(this.section() as Exclude<Section, 'users'>)
        .pipe(
          takeUntilDestroyed(this.destroy),
          finalize(() => this.loading.set(false)),
        )
        .subscribe({
          next: (r) => {
            this.catalogs.set(r);
            this.total.set(r.length);
          },
          error: (e) => this.error.set(this.message(e)),
        });
  }
  private loadOptions() {
    this.optionsReady.set(false);
    this.api
      .options()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.options.set(r);
          this.optionsReady.set(true);
        },
        error: (e) => this.error.set(this.message(e)),
      });
  }
  search() {
    if (this.filters.invalid) return;
    this.page.set(1);
    this.reload();
  }
  paginate(delta: number) {
    this.page.update((p) => p + delta);
    this.reload();
  }
  filteredCatalogs() {
    const q = this.filters.controls.search.value.trim().toLowerCase();
    return this.catalogs().filter((c) =>
      `${c.name ?? c.code} ${c.description ?? ''}`.toLowerCase().includes(q),
    );
  }
  hasOption(kind: 'areas' | 'eaims', id: number) {
    return this.options()[kind].some((o) => o.id === id);
  }
  fullName(user: UserRecord) {
    return [user.firstName, user.secondName, user.firstSurname, user.secondSurname]
      .filter(Boolean)
      .join(' ');
  }
  toggle(id: number, checked: boolean) {
    this.selectedIds.update((ids) => (checked ? [...ids, id] : ids.filter((x) => x !== id)));
  }
  private configureForm() {
    for (const control of Object.values(this.form.controls)) {
      control.clearValidators();
      control.reset('');
    }
    const c = this.form.controls;
    if (this.section() === 'users') {
      c.firstName.setValidators([Validators.required, Validators.maxLength(100)]);
      c.firstSurname.setValidators([Validators.required, Validators.maxLength(100)]);
      c.secondName.setValidators(Validators.maxLength(100));
      c.secondSurname.setValidators(Validators.maxLength(100));
      c.email.setValidators([Validators.required, Validators.email, Validators.maxLength(255)]);
      c.areaId.setValidators(Validators.required);
      c.userType.setValidators(Validators.required);
      if (this.mode() === 'new') c.password.setValidators(Validators.required);
    } else {
      (this.section() === 'permissions' ? c.code : c.name).setValidators([
        Validators.required,
        Validators.maxLength(100),
      ]);
      c.description.setValidators(
        this.section() === 'permissions'
          ? [Validators.required, Validators.maxLength(500)]
          : [Validators.maxLength(500)],
      );
    }
    for (const control of Object.values(c)) control.updateValueAndValidity();
  }
  openNew() {
    this.open(null);
  }
  open(record: Catalog | null) {
    this.mode.set(record ? 'edit' : 'new');
    this.selected.set(null);
    this.editingId.set(record?.id ?? null);
    this.selectedIds.set(record?.permissionIds ?? []);
    this.formError.set('');
    this.formReady.set(this.section() !== 'roles');
    this.configureForm();
    if (record)
      this.form.patchValue({
        name: record.name ?? '',
        code: record.code ?? '',
        description: record.description ?? '',
      });
    if (this.section() === 'roles')
      this.api
        .catalogs('permissions')
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (p) => {
            this.permissions.set(p);
            this.formReady.set(true);
          },
          error: (e) => this.formError.set(this.message(e)),
        });
    this.editor.nativeElement.showModal();
  }
  openUser(user: UserRecord, mode: 'edit' | 'roles' | 'detail') {
    this.mode.set(mode);
    this.editingId.set(user.id);
    this.selected.set(null);
    this.selectedIds.set([]);
    this.formReady.set(false);
    this.formError.set('');
    this.configureForm();
    this.editor.nativeElement.showModal();
    this.loading.set(true);
    this.api
      .user(user.id)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (u) => {
          this.formReady.set(true);
          this.selected.set(u);
          this.selectedIds.set(u.roles.map((r) => r.id));
          this.form.patchValue({
            firstName: u.firstName,
            secondName: u.secondName ?? '',
            firstSurname: u.firstSurname,
            secondSurname: u.secondSurname ?? '',
            email: u.email,
            areaId: String(u.areaId),
            eaimId: u.eaimId === null ? '' : String(u.eaimId),
            userType: u.userType === null ? '' : String(u.userType),
          });
        },
        error: (e) => this.formError.set(this.message(e)),
      });
  }
  close() {
    if (!this.saving()) this.editor.nativeElement.close();
  }
  save() {
    if (
      this.saving() ||
      this.loading() ||
      this.mode() === 'detail' ||
      !this.formReady() ||
      (this.section() === 'users' && !this.optionsReady())
    )
      return;
    this.formError.set('');
    const v = this.form.getRawValue();
    let request: Observable<unknown>;
    if (this.mode() === 'roles') request = this.api.roles(this.editingId()!, this.selectedIds());
    else {
      this.form.markAllAsTouched();
      if (this.form.invalid) {
        this.formError.set('Revisa los campos obligatorios y el formato del correo.');
        return;
      }
      if (this.section() === 'users') {
        if (
          !v.firstName.trim() ||
          !v.firstSurname.trim() ||
          (this.mode() === 'new' && !v.password.trim())
        ) {
          this.formError.set('Los nombres y la contraseña no pueden estar vacíos.');
          return;
        }
        const body: UserWrite = {
          firstName: v.firstName.trim(),
          secondName: v.secondName.trim(),
          firstSurname: v.firstSurname.trim(),
          secondSurname: v.secondSurname.trim(),
          email: v.email.trim(),
          areaId: Number(v.areaId),
          eaimId: v.eaimId ? Number(v.eaimId) : null,
          userType: Number(v.userType),
        };
        if (this.mode() === 'new') {
          body.password = v.password;
          body.roleIds = this.selectedIds();
        }
        request = this.api.save('users', this.editingId(), body);
      } else {
        if (
          !(this.section() === 'permissions' ? v.code : v.name).trim() ||
          (this.section() === 'permissions' && !v.description.trim())
        ) {
          this.formError.set('Completa los campos sin usar solo espacios.');
          return;
        }
        const body =
          this.section() === 'permissions'
            ? { code: v.code.trim(), description: v.description.trim() }
            : this.section() === 'roles'
              ? {
                  name: v.name.trim(),
                  description: v.description.trim(),
                  permissionIds: this.selectedIds(),
                }
              : { name: v.name.trim() };
        request = this.api.save(this.section(), this.editingId(), body);
      }
    }
    this.saving.set(true);
    request
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.editor.nativeElement.close();
          this.form.controls.password.reset('');
          this.notice.set('Los cambios se guardaron correctamente.');
          this.reload();
        },
        error: (e) => this.formError.set(this.message(e)),
      });
  }
  confirmDelete(id: number, name: string) {
    this.deletion.set({ id, name });
    this.formError.set('');
    this.confirmation.nativeElement.showModal();
  }
  cancelDelete() {
    if (!this.saving()) this.confirmation.nativeElement.close();
  }
  deactivate() {
    const record = this.deletion();
    if (!record || this.saving()) return;
    this.saving.set(true);
    this.api
      .deactivate(this.section(), record.id)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.confirmation.nativeElement.close();
          this.notice.set('El registro se desactivó. Su información histórica se conserva.');
          this.reload();
        },
        error: (e) => this.formError.set(this.message(e)),
      });
  }
  message(error: unknown) {
    if (!(error instanceof HttpErrorResponse))
      return 'No se pudo completar la operación. Inténtalo nuevamente.';
    if (error.status === 0) return 'No se pudo conectar con el servidor. Revisa la conexión.';
    if (error.status === 403) return 'No tienes permiso para realizar esta operación.';
    if (error.status === 404) return 'El registro ya no está disponible. Actualiza la lista.';
    if (error.status === 409)
      return (
        error.error?.message ??
        error.error?.error ??
        'Ya existe un registro con esos datos o hubo un cambio simultáneo.'
      );
    if (error.status === 400)
      return (
        error.error?.message ||
        Object.values(error.error?.errors ?? {})
          .flat()
          .join(' ') ||
        'Revisa los datos del formulario.'
      );
    return 'No se pudo completar la operación. Inténtalo nuevamente.';
  }
}
