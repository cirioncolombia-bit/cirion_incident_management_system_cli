# Network administration UI

Open **Admin → Network** (`/admin/network`). The feature is lazy-loaded and uses English labels. No package or backend changes are included in this frontend implementation.

## Permissions

Internal users need the existing database permission `catalogs.read` to access the menu and records. Creating, editing and deactivating additionally requires `catalogs.manage`. External users cannot access the administration feature, even when they have catalog permissions for operational screens. Countries are read-only for everyone. Existing Users access and menus retain their previous rules. No role names are used to authorize actions.

## Screen and forms

The catalog selector covers Cities, Nodes, GCOs, FiberTrays, physical ports, Equipment, port numbers, port statuses, Conduits, Fiber Colors and Countries. The list uses server search, pagination and an inactive-record filter. Hierarchical catalogs also have an optional searchable parent filter; clearing it shows all matching records.

Records use a single-column card layout on mobile, with additional columns at wider sizes. Forms use one column on mobile and two on wider screens. Dialogs scroll within the viewport. Buttons and inputs have at least 44px touch targets, visible focus, and wrapping text. Required markers and invalid fields are red.

Location forms use Country → City → Node → GCO → FiberTray, showing only the levels needed by the current resource. Changing a parent clears lower levels. Each relationship picker searches/paginates active options through the API instead of downloading a complete catalog. Edited records resolve their existing ancestor chain and preserve selected labels even when those records are outside the current option page. The backend validates active references and protected historical relationships when saving.

Ports select a port-number catalog record, status, and optional equipment/Conduit/FiberColor. Equipment is required for the database OCUPADO status, matching the current backend rule. New Equipment records are managed in their own catalog. Port edits and logical deactivation send the retrieved rowVersion. No assignment data or audit records are edited by this screen.

Deactivation always requires confirmation and preserves existing history. Dependency/conflict messages returned by the backend are displayed without closing the editor or confirmation, so users can review the issue. Inactive records have no edit/deactivation actions. No physical deletion or reactivation is offered.

## API integration

- Reads: existing `GET /api/NetworkConfiguration/{resource}` and `/{resource}/{id}`.
- Cities: existing `/api/City` POST/PUT/DELETE, with cityName and countryId.
- Nodes: existing `/api/Node` POST/PUT/DELETE, with nodeName, address and cityId.
- Other catalogs: existing NetworkConfiguration resource POST/PUT/DELETE routes.
- Port DELETE includes `{ rowVersion }`; other DELETE actions have no body.

Deploy the accompanying backend NetworkConfiguration implementation and apply its reviewed migration (`20261016163605_AddNetworkCatalogUniqueness`) before validating the integrated frontend. Review existing-data duplicates using the backend's read-only report before applying that migration. This frontend adds no migration or endpoint.

## Implementation

`network.models.ts` contains resource/field metadata and typed API models. `network.service.ts` translates frontend operations to the established endpoints and resolves selected ancestors. `network-lookup.ts` provides bounded relationship search and pagination. `network.ts`, its template and stylesheet implement the page and typed reactive form. No form library or generic dynamic-form framework is introduced.

Automated tests cover endpoint contracts, ancestor resolution, menu permissions, read-only access, dependent fields, validation, occupied equipment, rowversion, cancellation/conflicts, duplicate submission and stale responses. Browser checks use mocked API responses and widths 320, 360, 390, 768 and 1440px; they verify page/dialog overflow, edit preselection and port-save validation. Live SQL Server integration remains pending.

Verification results: production build passed with existing stylesheet budget warnings. All 36 focused network/navigation tests passed; the full suite returned 176 passing tests and the existing unrelated `app.spec.ts` title assertion failure. The existing App component/test was not changed.
