# Mobile responsiveness

Delivery's implicit grid columns could grow beyond the viewport when status options,
work-order references or customer names were long. At 350 px, synthetic long data
reproduced a document width of 793 px; edit headings also expanded beyond the screen.

The list, edit form and routed views now use shrinkable boundaries and explicit
minmax(0, 1fr) tracks. Mobile filters stack with full-width controls, summary cards
remain in two columns, and card headers and long values wrap inside the available
width. Larger screens retain their existing table with horizontal scrolling inside
the table wrapper.

Mobile cards expose the real Edit action. Create/edit actions stack on small screens,
and key controls have a minimum 44 px touch target. Active summary filters expose
aria-pressed; search has an accessible label. The navigation drawer can scroll on
short screens so its account actions remain reachable.

## Verification

Chromium checks exercised 10 routes at 320, 350, 390, 768, 1024 and 1440 px:
login, dashboard, Delivery list/create/edit/detail, incidents, assignments, users
and profile. Delivery API responses were simulated with long names, IDs and status
labels. Checks included expanded form sections and verified that the document and
visible fields fit the viewport, without globally hiding horizontal overflow.

113 browser assertions passed. Mobile card edit/save navigation and the short-height
drawer also passed. No page JavaScript errors were observed.

The production build and 13 existing edit integration tests passed. Four component
style budgets still emit warnings below their error thresholds; no budget settings
were changed. Browser checks validate layout and routing with simulated HTTP, not
SQL Server persistence.
