export type NetworkResource =
  | 'Countries'
  | 'Cities'
  | 'Nodes'
  | 'Gcos'
  | 'FiberTrays'
  | 'Ports'
  | 'Equipment'
  | 'PortNumbers'
  | 'PortStatuses'
  | 'Conduits'
  | 'FiberColors';

export interface NetworkSelection {
  id: number;
  name: string;
  parentName?: string | null;
}
export interface NetworkRecord extends NetworkSelection {
  isActive: boolean;
  parentId?: number | null;
  parentName?: string | null;
  address?: string | null;
  distanceToPort?: number | null;
  portNumberId?: number | null;
  portNumber?: number | null;
  equipmentId?: number | null;
  equipmentName?: string | null;
  statusId?: number | null;
  statusName?: string | null;
  conduitId?: number | null;
  conduitName?: string | null;
  fiberColorId?: number | null;
  fiberColorName?: string | null;
  rowVersion?: string | null;
}
export interface NetworkPage {
  rows: NetworkRecord[];
  page: number;
  totalCount: number;
  totalPages: number;
}
export interface NetworkQuery {
  page?: number;
  search?: string;
  parentId?: number | null;
  includeInactive?: boolean;
}
export type LocationField = 'countryId' | 'cityId' | 'nodeId' | 'gcoId' | 'fiberTrayId';
export type ReferenceField =
  'portNumberId' | 'statusId' | 'equipmentId' | 'conduitId' | 'fiberColorId';
export interface LocationLevel {
  field: LocationField;
  label: string;
  resource: NetworkResource;
  parent?: LocationField;
}
export const LOCATION_LEVELS: LocationLevel[] = [
  { field: 'countryId', label: 'Country', resource: 'Countries' },
  { field: 'cityId', label: 'City', resource: 'Cities', parent: 'countryId' },
  { field: 'nodeId', label: 'Node', resource: 'Nodes', parent: 'cityId' },
  { field: 'gcoId', label: 'GCO', resource: 'Gcos', parent: 'nodeId' },
  { field: 'fiberTrayId', label: 'FiberTray', resource: 'FiberTrays', parent: 'gcoId' },
];
export const PORT_REFERENCES: {
  field: ReferenceField;
  label: string;
  resource: NetworkResource;
  required: boolean;
}[] = [
  { field: 'portNumberId', label: 'Port number', resource: 'PortNumbers', required: true },
  { field: 'statusId', label: 'Port status', resource: 'PortStatuses', required: true },
  { field: 'equipmentId', label: 'Equipment', resource: 'Equipment', required: false },
  { field: 'conduitId', label: 'Conduit', resource: 'Conduits', required: false },
  { field: 'fiberColorId', label: 'Fiber Color', resource: 'FiberColors', required: false },
];
export interface NetworkCatalog {
  resource: NetworkResource;
  label: string;
  singular: string;
  description: string;
  locationDepth: number;
  maxName: number;
}
export const NETWORK_CATALOGS: NetworkCatalog[] = [
  {
    resource: 'Cities',
    label: 'Cities',
    singular: 'city',
    description: 'Cities and their countries.',
    locationDepth: 1,
    maxName: 50,
  },
  {
    resource: 'Nodes',
    label: 'Nodes',
    singular: 'node',
    description: 'Network nodes and their city locations.',
    locationDepth: 2,
    maxName: 200,
  },
  {
    resource: 'Gcos',
    label: 'GCOs',
    singular: 'GCO',
    description: 'GCOs belonging to network nodes.',
    locationDepth: 3,
    maxName: 200,
  },
  {
    resource: 'FiberTrays',
    label: 'FiberTrays',
    singular: 'FiberTray',
    description: 'FiberTrays belonging to GCOs.',
    locationDepth: 4,
    maxName: 100,
  },
  {
    resource: 'Ports',
    label: 'Physical ports',
    singular: 'physical port',
    description: 'Ports, equipment and independent optical connections.',
    locationDepth: 5,
    maxName: 0,
  },
  {
    resource: 'Equipment',
    label: 'Equipment',
    singular: 'equipment',
    description: 'Equipment available for network ports.',
    locationDepth: 0,
    maxName: 100,
  },
  {
    resource: 'PortNumbers',
    label: 'Port numbers',
    singular: 'port number',
    description: 'Numbers available to identify physical ports.',
    locationDepth: 0,
    maxName: 0,
  },
  {
    resource: 'PortStatuses',
    label: 'Port statuses',
    singular: 'port status',
    description: 'Status descriptions used by physical ports.',
    locationDepth: 0,
    maxName: 20,
  },
  {
    resource: 'Conduits',
    label: 'Conduits',
    singular: 'Conduit',
    description: 'Independent Conduits associated with ports.',
    locationDepth: 0,
    maxName: 50,
  },
  {
    resource: 'FiberColors',
    label: 'Fiber Colors',
    singular: 'Fiber Color',
    description: 'Fiber colors associated with ports.',
    locationDepth: 0,
    maxName: 50,
  },
  {
    resource: 'Countries',
    label: 'Countries',
    singular: 'country',
    description: 'Country reference catalog. Available for consultation only.',
    locationDepth: 0,
    maxName: 50,
  },
];
