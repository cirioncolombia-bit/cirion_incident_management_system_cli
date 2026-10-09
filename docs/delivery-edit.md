# Delivery editing

The Edit button in the Delivery list opens /delivery/:id/edit. The page loads
GET /api/Delivery/{id}/edit and GET /api/deliveries/create-options, using the existing
API URL and JWT interceptor. The backend endpoints from backend PR #15 must be available.

The form replaces the old examples with real Delivery values, numeric foreign-key
IDs, active catalog descriptions, child IDs and all consecutive quantities.
Changing city clears the node and limits its choices to that city.
Unavailable selections retain their IDs and show a placeholder; an active replacement
is required before saving.

Consecutives and installation costs may have zero rows. Added rows must be complete
or removed. Removal of the last row is allowed. The PUT sends the complete resulting
collections: [] requests soft deletion of all active children, existing IDs request
updates, and new rows omit the ID. It never sends editable audit or child DeliveryId
fields. DKO/TKT stays read-only and its original value is preserved.

Monetary inputs use numeric controls with decimal support so loading and saving
existing fractional amounts does not strip or round them. SO SAP, Revenue and
Observations retain their optional API semantics. No mock status history is generated.

Saving disables the form and guards against duplicate submissions. On success,
the page returns to /delivery?deliveryId={id}. Cancel returns to the same filtered
list without saving. A failed request keeps edits and displays an error for retry.
A successful save followed by navigation failure does not resend the PUT.
Loading follows route ID changes and cancels obsolete requests.

## Verification

- npm run build: passes, with four existing component style budget warnings.
- npm test -- --watch=false --include=src/app/features/incidents/delivery/pages/delivery-edit/delivery-edit.spec.ts:
  13 passing cases using Angular's real routing and HTTP testing utilities.
- git diff --check: passes.

Tests exercise the list Edit button, loading, values and decimal preservation,
node/city selection, unavailable catalog IDs, child updates/additions/removals,
duplicate-save protection, error recovery, invalid IDs, route reuse, cancellation
and filtered navigation. HTTP responses are simulated; a full save against SQL Server
still requires the user's local backend and database.
