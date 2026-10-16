export interface SelectOption {
  id: number;
  name: string;
}

export interface NodeSelectOption extends SelectOption {
  cityId: number;
}

export interface ResponsibleSelectOption extends SelectOption {
  eaimId: number | null;
}

export interface DeliveryCreateOptions {
  cities: SelectOption[];
  nodes: NodeSelectOption[];
  deliveryTypes: SelectOption[];
  deliveryStatuses: SelectOption[];
  deliveryTechnologies: SelectOption[];
  landlords: SelectOption[];
  eaims: SelectOption[];
  responsibles: ResponsibleSelectOption[];
  deliveryCauses: SelectOption[];
}

export interface ApiResponse<T> {
  data: T;
  message: string;
}
