export interface DeliveryStatusPeriod {
  id: number;
  previousStatusId: number | null;
  previousStatusDescription: string | null;
  statusId: number;
  statusDescription: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  changedBy: number | null;
  isTrackingStart: boolean;
}

export interface DeliveryStatusTotal {
  statusId: number;
  statusDescription: string;
  visits: number;
  durationSeconds: number;
}

export interface DeliveryStatusHistoryData {
  deliveryId: number;
  calculatedAt: string;
  trackingStartedAt: string | null;
  isPartialHistory: boolean;
  periods: DeliveryStatusPeriod[];
  totalsByStatus: DeliveryStatusTotal[];
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 1440)}d ${String(Math.floor(minutes % 1440 / 60)).padStart(2, '0')}h ${String(minutes % 60).padStart(2, '0')}m`;
}

export function currentPeriod(history: DeliveryStatusHistoryData | null | undefined) {
  return history ? [...history.periods].reverse().find((period) => period.endedAt === null) : undefined;
}
