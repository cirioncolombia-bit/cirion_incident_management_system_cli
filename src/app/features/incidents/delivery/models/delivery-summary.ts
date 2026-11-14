export interface DeliverySummary {
  currentStatusStartedAt?: string | null;
  id: number;
  dkoAssignmentDate?: string | null;
  eaimSurveyRequestDate?: string | null;
  installationDate?: string | null;
  workOrderId: string;
  rfsFiberChain: string;
  soSap: string | null;
  clientId: number | null;
  clientName: string | null;
  siteType?: string | null;
  buildingSite: string;
  address: string;
  revenue: number | null;
  contactName: string;
  email: string;
  mobilePhone: string | number | null;
  surveryCost: number;
  installationBudget: number;
  totalInstallationCost?: number;
  observation: string;
  isActive: boolean;
  cityId: number;
  nodeId: number;
  typeId: number;
  statusId: number;
  technologyId: number;
  eaimId: number;
  userId: number;
  cityName: string | null;
  nodeName: string | null;
  typeDescription: string | null;
  statusDescription: string | null;
  technologyDescription: string | null;
  eaimName: string | null;
  responsibleName: string | null;
}

export interface DeliveryListQuery {
  page: number;
  pageSize: number;
  year?: number;
  month?: number;
  day?: number;
  statusId?: number;
  cityId?: number;
  nodeId?: number;
  eaimId?: number;
  createdBy?: number;
  search?: string;
  status?: string;
  deliveryId?: number;
}

export interface DeliveryPage {
  calculatedAt?: string;
  rows: DeliverySummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  totalActive: number;
  statuses: { description: string | null; count: number }[];
}

export interface DeliveryFilterOption { id: number; name: string; }
export interface DeliveryFilterOptions {
  currentYear: number;
  years: number[];
  statuses: (DeliveryFilterOption & { isActive: boolean })[];
  cities: DeliveryFilterOption[];
  eaims: DeliveryFilterOption[];
  creators: DeliveryFilterOption[];
}
