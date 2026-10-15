import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Incidents } from './incidents';
import { IncidentDetail, IncidentsService } from '../../services/incidents.service';
const record = {
  id: 1,
  title: 'Falla de servicio',
  description: 'Descripción',
  typeId: 7,
  typeName: 'Servicio',
  statusId: 42,
  statusName: 'Abierto',
  creatorId: 3,
  creatorName: 'Ana',
  assigneeId: null,
  assigneeName: null,
  createAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
};
const data: IncidentDetail = { incident: record, observations: [], attachments: [] };
describe('Incidents integration', () => {
  function setup(permissions = ['incidents.read', 'incidents.write'], id: string | null = null) {
    const params = new Subject<ReturnType<typeof convertToParamMap>>();
    const api = {
      me: vi.fn(() => of({ permissions })),
      options: vi.fn(() =>
        of({
          types: [{ id: 7, name: 'Servicio' }],
          statuses: [{ id: 42, name: 'Abierto', isInitial: true }],
          users: [{ id: 3, name: 'Ana' }],
        }),
      ),
      list: vi.fn(() =>
        of({ rows: [record], totalCount: 1, totalPages: 1, page: 1, pageSize: 12 }),
      ),
      detail: vi.fn(() => of(data)),
      create: vi.fn(() => of(5)),
      update: vi.fn(() => of(void 0)),
      assign: vi.fn(() => of(void 0)),
      observe: vi.fn(() => of({ data: 2 })),
      upload: vi.fn(() => of({ data: 4 })),
      download: vi.fn(() => of(new Blob(['file']))),
      deactivate: vi.fn(() => of(void 0)),
    };
    const router = { navigate: vi.fn(() => Promise.resolve(true)) };
    TestBed.configureTestingModule({
      imports: [Incidents],
      providers: [
        { provide: IncidentsService, useValue: api },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      ],
    });
    const fixture = TestBed.createComponent(Incidents);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.editor.nativeElement.showModal = vi.fn();
    component.editor.nativeElement.close = vi.fn();
    component.confirmation.nativeElement.showModal = vi.fn();
    component.confirmation.nativeElement.close = vi.fn();
    if (id !== null) params.next(convertToParamMap({ id }));
    return { component, api, router, fixture, params };
  }
  it('does not load module data without read permission', () => {
    const { api, component } = setup([]);
    expect(component.canRead()).toBe(false);
    expect(api.list).not.toHaveBeenCalled();
    expect(api.options).not.toHaveBeenCalled();
  });
  it('allows reader access but hides every mutation control', () => {
    const { component, fixture } = setup(['incidents.read'], '1');
    fixture.detectChanges();
    expect(component.detail()).toEqual(data);
    expect(fixture.nativeElement.textContent).not.toContain('Editar incidente');
    expect(fixture.nativeElement.textContent).not.toContain('Add observation');
  });
  it('creates without hardcoded status so the backend chooses its database initial status', () => {
    const { component, api, router } = setup();
    component.openCreate();
    component.form.patchValue({ title: 'Nuevo', description: 'Detalle', typeId: '7' });
    component.save();
    expect(api.create).toHaveBeenCalledWith({ title: 'Nuevo', description: 'Detalle', typeId: 7 });
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { id: 5 } }),
    );
  });
  it('does not repeat a successful create when navigation fails', async () => {
    const { component, api, router } = setup();
    router.navigate.mockResolvedValue(false);
    component.openCreate();
    component.form.patchValue({ title: 'Nuevo', description: 'Detalle', typeId: '7' });
    component.save();
    await Promise.resolve();
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(component.editor.nativeElement.close).toHaveBeenCalled();
    expect(component.error()).toContain('was created');
  });
  it('updates incident separately from assignment', () => {
    const { component, api } = setup(undefined, '1');
    component.openEdit('edit');
    component.form.controls.title.setValue('Actualizado');
    component.save();
    expect(api.update).toHaveBeenCalledWith(1, {
      title: 'Actualizado',
      description: 'Descripción',
      typeId: 7,
      statusId: 42,
    });
    expect(api.assign).not.toHaveBeenCalled();
  });
  it('supports removing an assignment without updating the incident profile', () => {
    const { component, api } = setup(undefined, '1');
    component.openEdit('assign');
    component.save();
    expect(api.assign).toHaveBeenCalledWith(1, null);
    expect(api.update).not.toHaveBeenCalled();
  });
  it('validates whitespace before creating', () => {
    const { component, api } = setup();
    component.openCreate();
    component.form.patchValue({ title: ' ', description: 'Detalle', typeId: '7' });
    component.save();
    expect(api.create).not.toHaveBeenCalled();
    expect(component.formError()).not.toBe('');
  });
  it('prevents duplicate submissions while a save is pending', () => {
    const { component, api } = setup(undefined, '1');
    const pending = new Subject<undefined>();
    api.assign.mockReturnValue(pending);
    component.openEdit('assign');
    component.save();
    component.save();
    expect(api.assign).toHaveBeenCalledTimes(1);
  });
  it('does not deactivate until confirmation is accepted', () => {
    const { component, api } = setup(undefined, '1');
    component.confirmDeactivate();
    expect(api.deactivate).not.toHaveBeenCalled();
    component.deactivate();
    expect(api.deactivate).toHaveBeenCalledWith(1);
  });
  it('posts trimmed observation and resets only after success', () => {
    const { component, api } = setup(undefined, '1');
    component.observation.controls.text.setValue(' Avance ');
    component.addObservation();
    expect(api.observe).toHaveBeenCalledWith(1, 'Avance');
    expect(component.observation.controls.text.value).toBe('');
  });
  it('preserves observation text on failure', () => {
    const { component, api } = setup(undefined, '1');
    api.observe.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    component.observation.controls.text.setValue('Avance');
    component.addObservation();
    expect(component.observation.controls.text.value).toBe('Avance');
    expect(component.observationError()).toContain('changed');
  });
  it('rejects an empty file without an HTTP upload', () => {
    const { component, api } = setup(undefined, '1');
    component.selectedFile.set(new File([], 'empty.txt'));
    component.upload();
    expect(api.upload).not.toHaveBeenCalled();
    expect(component.fileError()).toContain('empty');
  });
  it('shows server size error and retains file for user review', () => {
    const { component, api } = setup(undefined, '1');
    api.upload.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 413 })));
    component.selectedFile.set(new File(['data'], 'report.txt'));
    component.upload();
    expect(component.fileError()).toContain('size');
    expect(component.selectedFile()?.name).toBe('report.txt');
  });
  it('ignores stale detail responses when the selected incident changes', () => {
    const { component, api, params } = setup();
    const first = new Subject<IncidentDetail>(),
      second = new Subject<IncidentDetail>();
    api.detail.mockReturnValueOnce(first).mockReturnValueOnce(second);
    params.next(convertToParamMap({ id: '1' }));
    params.next(convertToParamMap({ id: '2' }));
    second.next({ ...data, incident: { ...record, id: 2, title: 'Segundo' } });
    first.next(data);
    expect(component.detail()?.incident.id).toBe(2);
  });
  it('rejects invalid route identifiers without requesting a detail', () => {
    const { component, api } = setup(undefined, 'invalid');
    expect(component.invalidId()).toBe(true);
    expect(api.detail).not.toHaveBeenCalled();
  });
});
