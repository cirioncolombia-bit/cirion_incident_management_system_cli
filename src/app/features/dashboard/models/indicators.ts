export type MeasurementType = 1 | 2 | 3 | 4;
export const measurementTypes = [
  { id: 1 as MeasurementType, label: 'Porcentaje (%)' },
  { id: 2 as MeasurementType, label: 'Dinero (COP)' },
  { id: 3 as MeasurementType, label: 'Número entero' },
  { id: 4 as MeasurementType, label: 'Días' },
];
export const months = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
export const currentYear = () =>
  Number(
    new Intl.DateTimeFormat('en', { timeZone: 'America/Bogota', year: 'numeric' }).format(
      new Date(),
    ),
  );
export const currentMonth = () =>
  Number(
    new Intl.DateTimeFormat('en', { timeZone: 'America/Bogota', month: 'numeric' }).format(
      new Date(),
    ),
  );
export function decimalUnits(raw: string): bigint {
  const [whole, fraction = ''] = raw.replace('-', '').split('.');
  const units = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return raw.startsWith('-') ? -units : units;
}
export interface Indicator {
  id: number;
  name: string;
  measurementType: MeasurementType;
  isActive: boolean;
  hasRecords: boolean;
  rowVersion: string;
}
export interface MonthlyRecord {
  id: number;
  indicatorId: number;
  indicatorName: string;
  measurementType: MeasurementType;
  indicatorIsActive: boolean;
  year: number;
  month: number;
  value: string;
  rowVersion: string;
}
export interface Page<T> {
  rows: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
export interface ChartSeries {
  indicator: Pick<Indicator, 'id' | 'name' | 'measurementType' | 'isActive'>;
  records: MonthlyRecord[];
}
export interface Query {
  page?: number;
  pageSize?: number;
  search?: string;
  includeInactive?: boolean;
  year?: number;
  month?: number | null;
  indicatorId?: number | null;
}
export function typeLabel(type: MeasurementType) {
  return measurementTypes.find((x) => x.id === type)?.label ?? '';
}
export function formatValue(raw: string, type: MeasurementType): string {
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) return '—';
  const [integer, fraction = ''] = raw.replace('-', '').split('.');
  const sign = raw.startsWith('-') ? '−' : '';
  const whole = new Intl.NumberFormat('es-CO').format(BigInt(integer));
  const decimals =
    type === 2 ? ',' + fraction.padEnd(2, '0') : type === 3 ? '' : fraction ? ',' + fraction : '';
  return (
    (type === 2 ? '$ ' : '') +
    sign +
    whole +
    decimals +
    (type === 1 ? ' %' : type === 2 ? ' COP' : type === 4 ? ' días' : '')
  );
}
export function validValue(raw: string, type: MeasurementType): boolean {
  return (
    /^-?\d{1,16}([.,]\d{1,2})?$/.test(raw) && (type !== 3 || /^-?\d{1,16}([.,]0{1,2})?$/.test(raw))
  );
}
export function requestError(error: unknown): string {
  const e = error as { status?: number; error?: { message?: string } };
  if (e.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  if (e.status === 403) return 'No tienes permiso para esta operación.';
  if (e.status === 404)
    return 'El recurso no está disponible. Actualiza la página y verifica que el backend incluya el módulo de indicadores.';
  return e.error?.message || 'No fue posible completar la operación. Intenta nuevamente.';
}
