# J-MDM Workspace Layout and Navigation Standard

## Scope
Applies to the authenticated ITAM workspace and standalone Quick Scanner/Scanner Library screens. Authentication and account security pages are explicit exceptions and remain standalone. Implemented shared standalone shell: `dist/workspace-shell.js` and `dist/workspace-shell.css`. The authenticated SPA retains its existing permission-aware `dist/navigation.js`; do not bypass RBAC by replacing it with static public markup.

## Persistent application chrome
- Top application bar: J-MDM brand at left, context-aware search, session/connection indicator at right. Header height **68 px desktop**, **64 px tablet/mobile**.
- Left application navigation: **224 px** on desktop, fixed under the header while content scrolls. Same section taxonomy across Quick Scanner and ITAM: Overview, Asset Management, Quick Scanner, Administration.
- A page shows exactly one active navigation item with `aria-current="page"`. Navigation never contains duplicate top/side lists competing for attention.
- Main content starts to the right of the sidebar, with a consistent **22–54 px** horizontal gutter. Page headings, cards, tables, and modal forms share the `workspace.css` design tokens.
- Quick scanner pages share the same chrome through imported assets instead of maintaining separate page-specific headers.
- Public pages may display navigation to ITAM sign-in, but must not expose permission-gated links or any records. Gated items are disclosed only after `/api/auth/me` verifies an authenticated session, while server-side RBAC remains authoritative.

## Responsive and accessibility behavior
- At widths of **900 px and below**, the sidebar is closed by default; the header's hamburger opens a drawer with an overlay. The content must not scroll beneath an open drawer.
- Escape, overlay click, or navigation closes the drawer. Keyboard focus remains within the drawer while open and returns to its previous trigger when closed. Expanded state and control relationships must be announced to assistive technologies.
- At widths of **610 px and below**, the top bar simplifies its search adornments and account label to preserve tap targets.
- Use semantic `header`, `nav`, `main`, and `form` regions. All functional controls require accessible names, visible focus, and adequate contrast.
- Respect `prefers-reduced-motion`; do not animate navigation for users who request reduced motion.

## Regression requirements
- Test the dashboard, asset scanner, Quick Scanner, Scanner Library, inventory, history, and settings routes with keyboard navigation, backward/forward navigation, mobile resizing, and dark/light themes.
- Preserve the existing scanner-pairing token flow, scanner results, local storage, global synchronization, asset CRUD, authentication, and account settings independently of the shell.
- Never modify quick-scanner `localStorage` keys as part of layout work.
- Use server-side permission checks; hiding a link is never authorization.

## Maintenance
Update the shared shell modules for future standalone pages and apply the same J-MDM chrome. Keep business-specific controls in the page body. Avoid another standalone header/sidebar implementation or ad-hoc spacing palette.
