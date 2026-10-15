import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, Observable } from 'rxjs';
import {
  Attachment,
  IncidentDetail,
  IncidentOptions,
  IncidentWrite,
  IncidentsService,
} from '../../services/incidents.service';
@Component({
  selector: 'app-incidents',
  imports: [ReactiveFormsModule, DatePipe],
  styleUrl: './incidents.scss',
  templateUrl: './incidents.html',
})
export class Incidents {
  private readonly api = inject(IncidentsService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  @ViewChild('editor') editor!: ElementRef<HTMLDialogElement>;
  @ViewChild('confirmation') confirmation!: ElementRef<HTMLDialogElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  readonly checking = signal(true);
  readonly canRead = signal(false);
  readonly canWrite = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly optionsReady = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly observationError = signal('');
  readonly fileError = signal('');
  readonly notice = signal('');
  readonly options = signal<IncidentOptions>({ types: [], statuses: [], users: [] });
  readonly rows = signal<IncidentDetail['incident'][]>([]);
  readonly detail = signal<IncidentDetail | null>(null);
  readonly detailId = signal<number | null>(null);
  readonly page = signal(1);
  readonly totalPages = signal(0);
  readonly total = signal(0);
  readonly invalidId = signal(false);
  readonly mode = signal<'create' | 'edit' | 'assign'>('create');
  readonly selectedFile = signal<File | null>(null);
  readonly downloading = signal<number | null>(null);
  private listVersion = 0;
  private detailVersion = 0;
  readonly filters = this.fb.nonNullable.group({
    search: ['', Validators.maxLength(200)],
    typeId: '',
    statusId: '',
    assigneeId: '',
  });
  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(10000)]],
    typeId: ['', Validators.required],
    statusId: '',
    assigneeId: '',
  });
  readonly observation = this.fb.nonNullable.group({
    text: ['', [Validators.required, Validators.maxLength(10000)]],
  });
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroy)).subscribe((params) => {
      const value = params.get('id');
      const id = value === null ? null : Number(value);
      this.detailVersion++;
      this.detail.set(null);
      this.selectedFile.set(null);
      this.observation.reset();
      this.observationError.set('');
      this.fileError.set('');
      this.invalidId.set(id !== null && (!Number.isSafeInteger(id) || id <= 0));
      this.detailId.set(this.invalidId() ? null : id);
      if (this.invalidId()) {
        this.error.set('The incident ID is invalid.');
        this.loading.set(false);
        return;
      }
      if (this.canRead()) this.reload();
    });
    this.loadAccess();
  }
  private loadAccess() {
    this.checking.set(true);
    if (!this.invalidId()) this.error.set('');
    this.api
      .me()
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.checking.set(false)),
      )
      .subscribe({
        next: (me) => {
          this.canRead.set(me.permissions.includes('incidents.read'));
          this.canWrite.set(me.permissions.includes('incidents.write'));
          if (this.canRead()) {
            this.loadOptions();
            this.reload();
          }
        },
        error: (e) => this.error.set(this.message(e)),
      });
  }
  reload() {
    if (this.invalidId()) return;
    if (!this.canRead()) this.loadAccess();
    else if (this.detailId() !== null) this.loadDetail();
    else this.loadList();
  }
  retry() {
    if (this.canRead()) {
      this.loadOptions();
      this.reload();
    } else this.loadAccess();
  }
  private loadOptions() {
    this.optionsReady.set(false);
    this.api
      .options()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (o) => {
          this.options.set(o);
          this.optionsReady.set(true);
        },
        error: (e) => this.error.set(this.message(e)),
      });
  }
  loadList() {
    const version = ++this.listVersion;
    this.loading.set(true);
    this.error.set('');
    this.api
      .list(this.page(), this.filters.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (version === this.listVersion && this.detailId() === null) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (p) => {
          if (version !== this.listVersion || this.detailId() !== null || this.invalidId()) return;
          this.rows.set(p.rows);
          this.totalPages.set(p.totalPages);
          this.total.set(p.totalCount);
          if (p.totalPages > 0 && this.page() > p.totalPages) {
            this.page.set(p.totalPages);
            this.loadList();
          }
        },
        error: (e) => {
          if (version === this.listVersion && this.detailId() === null)
            this.error.set(this.message(e));
        },
      });
  }
  loadDetail() {
    const id = this.detailId();
    if (id === null) return;
    const version = ++this.detailVersion;
    this.loading.set(true);
    this.error.set('');
    this.api
      .detail(id)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => {
          if (version === this.detailVersion) this.loading.set(false);
        }),
      )
      .subscribe({
        next: (d) => {
          if (version === this.detailVersion && this.detailId() === id) this.detail.set(d);
        },
        error: (e) => {
          if (version === this.detailVersion) this.error.set(this.message(e));
        },
      });
  }
  openDetail(id: number) {
    this.notice.set('');
    void this.router
      .navigate([], { relativeTo: this.route, queryParams: { id } })
      .catch(() => this.error.set('Could not open the details.'));
  }
  back() {
    void this.router
      .navigate([], { relativeTo: this.route, queryParams: {} })
      .catch(() => this.error.set('Could not return to the list.'));
  }
  search() {
    if (this.filters.invalid || this.loading()) return;
    this.page.set(1);
    this.loadList();
  }
  paginate(delta: number) {
    if (this.loading()) return;
    this.page.update((p) => p + delta);
    this.loadList();
  }
  clearFilters() {
    this.filters.reset();
    this.search();
  }
  openCreate() {
    if (!this.canWrite() || !this.optionsReady()) return;
    this.mode.set('create');
    this.formError.set('');
    this.form.reset();
    this.form.controls.statusId.clearValidators();
    this.form.controls.statusId.updateValueAndValidity();
    this.editor.nativeElement.showModal();
  }
  openEdit(mode: 'edit' | 'assign') {
    const incident = this.detail()?.incident;
    if (!incident || !this.canWrite() || !this.optionsReady() || this.saving() || this.loading())
      return;
    this.mode.set(mode);
    this.formError.set('');
    this.form.reset({
      title: incident.title,
      description: incident.description,
      typeId: String(incident.typeId),
      statusId: String(incident.statusId),
      assigneeId: incident.assigneeId === null ? '' : String(incident.assigneeId),
    });
    this.form.controls.statusId.setValidators(Validators.required);
    this.form.controls.statusId.updateValueAndValidity();
    this.editor.nativeElement.showModal();
  }
  hasOption(kind: 'types' | 'statuses' | 'users', id: number) {
    return this.options()[kind].some((o) => o.id === id);
  }
  close() {
    if (!this.saving()) this.editor.nativeElement.close();
  }
  save() {
    if (this.saving() || !this.canWrite() || !this.optionsReady()) return;
    this.formError.set('');
    const v = this.form.getRawValue(),
      id = this.detailId();
    let request: Observable<unknown>;
    if (this.mode() === 'assign') {
      if (id === null) return;
      request = this.api.assign(id, v.assigneeId ? Number(v.assigneeId) : null);
    } else {
      this.form.markAllAsTouched();
      if (this.form.invalid || !v.title.trim() || !v.description.trim()) {
        this.formError.set('Enter the type, title and description. Review the highlighted fields.');
        return;
      }
      const body: IncidentWrite = {
        title: v.title.trim(),
        description: v.description.trim(),
        typeId: Number(v.typeId),
      };
      if (v.statusId) body.statusId = Number(v.statusId);
      if (this.mode() !== 'create' && id === null) return;
      request = this.mode() === 'create' ? this.api.create(body) : this.api.update(id!, body);
    }
    this.saving.set(true);
    const mode = this.mode();
    request
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (createdId) => {
          this.editor.nativeElement.close();
          this.notice.set(
            mode === 'create'
              ? 'The incident was created successfully.'
              : 'Changes saved successfully.',
          );
          if (mode === 'create')
            void this.router
              .navigate([], { relativeTo: this.route, queryParams: { id: createdId } })
              .then((ok) => {
                if (!ok)
                  this.error.set(
                    'The incident was created, but its details could not be opened. Refresh the list.',
                  );
              })
              .catch(() =>
                this.error.set(
                  'The incident was created, but its details could not be opened. Refresh the list.',
                ),
              );
          else if (this.detailId() === id) this.loadDetail();
        },
        error: (e) => this.formError.set(this.message(e)),
      });
  }
  addObservation() {
    const id = this.detailId();
    if (id === null || this.saving() || this.loading() || !this.canWrite()) return;
    this.observation.markAllAsTouched();
    const text = this.observation.controls.text.value.trim();
    if (this.observation.invalid || !text) {
      this.observationError.set('Enter an observation of up to 10,000 characters.');
      return;
    }
    this.saving.set(true);
    this.observationError.set('');
    this.api
      .observe(id, text)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          if (this.detailId() !== id) return;
          this.observation.reset();
          this.notice.set('The observation was added successfully.');
          this.loadDetail();
        },
        error: (e) => {
          if (this.detailId() === id) this.observationError.set(this.message(e));
        },
      });
  }
  chooseFile(event: Event) {
    this.fileError.set('');
    this.selectedFile.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }
  upload() {
    const id = this.detailId(),
      file = this.selectedFile();
    if (id === null || this.saving() || this.loading() || !this.canWrite() || !file) return;
    if (file.size === 0) {
      this.fileError.set('The file is empty. Select another file.');
      return;
    }
    this.saving.set(true);
    this.fileError.set('');
    this.api
      .upload(id, file)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          if (this.detailId() !== id) return;
          this.selectedFile.set(null);
          if (this.fileInput) this.fileInput.nativeElement.value = '';
          this.notice.set('The file was attached successfully.');
          this.loadDetail();
        },
        error: (e) => {
          if (this.detailId() === id) this.fileError.set(this.message(e));
        },
      });
  }
  download(file: Attachment) {
    const id = this.detailId();
    if (id === null || this.downloading() !== null) return;
    this.downloading.set(file.id);
    this.fileError.set('');
    this.api
      .download(id, file.id)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.downloading.set(null)),
      )
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = file.fileName;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        error: (e) => {
          if (this.detailId() === id) this.fileError.set(this.message(e));
        },
      });
  }
  bytes(size: number) {
    return size < 1024
      ? `${size} B`
      : size < 1048576
        ? `${(size / 1024).toFixed(1)} KB`
        : `${(size / 1048576).toFixed(1)} MB`;
  }
  confirmDeactivate() {
    if (this.detail() && this.canWrite()) {
      this.formError.set('');
      this.confirmation.nativeElement.showModal();
    }
  }
  cancelDeactivate() {
    if (!this.saving()) this.confirmation.nativeElement.close();
  }
  deactivate() {
    const id = this.detailId();
    if (id === null || this.saving() || !this.canWrite()) return;
    this.saving.set(true);
    this.api
      .deactivate(id)
      .pipe(
        takeUntilDestroyed(this.destroy),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.confirmation.nativeElement.close();
          this.notice.set('The incident was deactivated. Its history is preserved.');
          this.back();
        },
        error: (e) => this.formError.set(this.message(e)),
      });
  }
  private message(error: unknown): string {
    if (!(error instanceof HttpErrorResponse))
      return 'The operation could not be completed. Please try again.';
    if (error.status === 0) return 'Could not connect to the server. Check your connection.';
    if (error.status === 403) return 'You do not have permission to perform this operation.';
    if (error.status === 404) return 'The incident or file is no longer available.';
    if (error.status === 413)
      return 'The file exceeds the server size limit. Select a smaller file.';
    if (error.status === 409)
      return 'The incident changed while you were editing it. Refresh the details and try again.';
    if (error.status === 400)
      return (
        error.error?.message ||
        Object.values(error.error?.errors ?? {})
          .flat()
          .join(' ') ||
        'Review the form information.'
      );
    return 'The operation could not be completed. Please try again.';
  }
}
