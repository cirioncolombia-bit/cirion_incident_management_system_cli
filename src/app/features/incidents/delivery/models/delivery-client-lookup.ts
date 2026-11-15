export interface DeliveryClient {
  id: number;
  name: string;
  siteType: string;
  address: string;
}

export interface DeliveryClientPage {
  rows: DeliveryClient[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}
