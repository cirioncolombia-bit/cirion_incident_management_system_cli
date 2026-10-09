export interface CreateDelivery {
  workOrderId: string;
  rfsFiberChain: string;
  soSap: string | null;
  clientName: string;
  buildingSite: string;
  address: string;
  cityId: number;
  nodeId: number;
  revenue: number | null;
  contactName: string;
  email: string;
  mobilePhone: number;
  typeId: number;
  statusId: number;
  technologyId: number;
  eaimId: number;
  userId: number;
  surveryCost: number;
  installationBudget: number;
  observation: string;
  consecutives: {
    landlordId: number;
    consecutive: string;
    metersCoundiut: number;
    postsQuantity: number;
    aditionalNumber: number;
  }[];
  installationCosts: { causeId: number; cost: number }[];
}

export interface CreatedDelivery {
  id: number;
}
