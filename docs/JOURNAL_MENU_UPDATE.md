# Journal menu update

The owner requested that Journal no longer appear in the client menu. Removed its shared navigation anchor, including the mobile menu. P/L Calendar remains available. Existing Journal route, data and access checks remain preserved; no member data was deleted. Authentication, the public homepage and the PC connector configuration were not changed.

`JOURNAL_NAV_REMOVAL_BASELINE.json` records 33 updated preservation entries after regeneration. Before accepting each hash, the current bytes were compared against the prior bytes with only Journal navigation anchors removed. This includes both desktop and mobile navigation; offline preview catalog links are retained. Original preservation manifests remain intact.

Validation: `scripts\pnpm.cmd build`, `scripts\pnpm.cmd lint`, `scripts\pnpm.cmd typecheck`, `scripts\pnpm.cmd test`. See the task report for results. No MetaApi subscription, payment or connection was activated.
