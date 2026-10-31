# Sagility workspace visual and navigation update

The scanner, library, login, security and admin shell now share `workspace.css`: system typography, restrained navy/teal/cyan accents, thin separators, soft surfaces, compact toolbars and rounded sheets. Light/dark colors are paired for readable tables, fields and buttons. A small shared theme preference reflects the admin's existing theme choice on scanner pages. Legacy theme-critical overrides are reconciled in a named CSS layer rather than relying on more selector specificity.

The Scanner Library is linked from the admin sidebar and dashboard because Quick Scanner entries and structured ITAM assets are separate stores. The entry-source bar explicitly identifies Shared entries or This browser. A signed-in browser without legacy local entries shows authorized shared entries automatically; this performs reads only. Browsers containing local entries retain their local view until the user chooses shared viewing or explicit backup/upload. Explicit local-mode choices remain respected.

Backup and migration controls are grouped under an expandable section. Downloads remain visible there, and upload still requires a JSON backup first. Shared-view refresh does not upload legacy arrays. Conflict review keeps both versions and pins the reviewed revision. Read-only users see disabled edit controls; server authorization remains decisive.

Sign-in from the scanner returns to that scanner/library page. Only `/quick` and `/quick/assets` are accepted return targets, including after account-security completion; arbitrary URLs fall back to the dashboard. General admin sign-in still opens the dashboard.

Accuracy fixes: list summaries use the returned row count and actual request limit (25 assets/50 generic records); “New Assets” becomes “New asset”; login/metadata/footer copy reflects shared storage; pairing copy explains renewal and re-pairing after restart; photo upload allows choosing a gallery image. The library initially selects saved assets when present, or scan history when that is the populated collection, and preserves a manually chosen tab.

Verification uses the actual signed-in production UI for read-only inspection and an isolated local backend containing synthetic records for interaction tests. Do not use fixture counts as production inventory evidence. Production writes, historical browser migration and camera permissions are outside visual QA. The hosted service's existing Basic Asset Information fallback remains accurate; this visual update does not add Asset 360 server capabilities.
