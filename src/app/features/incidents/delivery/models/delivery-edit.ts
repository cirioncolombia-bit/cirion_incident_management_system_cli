import { CreateDelivery } from './create-delivery';
import { DeliverySummary } from './delivery-summary';

export interface DeliveryConsecutiveEdit {
  id: number;
  deliveryId: number;
  landlordId: number;
  landlordName: string | null;
  consecutive: string;
  metersCoundiut: number;
  postsQuantity: number;
  aditionalNumber: number;
  isActive: boolean;
}

export interface DeliveryInstallationCostEdit {
  id: number;
  deliveryId: number;
  causeId: number;
  causeDescription: string | null;
  cost: number;
  isActive: boolean;
}

export interface DeliveryEditData extends DeliverySummary {
  consecutives: DeliveryConsecutiveEdit[];
  installationCosts: DeliveryInstallationCostEdit[];
}

export interface UpdateDeliveryEdit extends Omit<
  CreateDelivery,
  'consecutives' | 'installationCosts'
> {
  consecutives: (CreateDelivery['consecutives'][number] & { id?: number })[];
  installationCosts: (CreateDelivery['installationCosts'][number] & { id?: number })[];
}
