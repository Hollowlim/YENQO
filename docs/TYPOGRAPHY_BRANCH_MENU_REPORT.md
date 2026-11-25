# Typography and branched navigation

The supplied React Bits prompt is BranchedMenu despite its undefined component title. Its tree-style presentation is adapted using native HTML details/summary groups and CSS branch rails, without React/Hugeicons dependencies. Workspace and Account groups are open by default, fold with mouse/touch or Enter, and preserve real navigation links and current-page highlighting. Admin navigation receives the same treatment. The adaptation does not include the React component's animated selection-path engine.

Replaced Arial with locally bundled Manrope for body/UI text and Outfit for headings, adjusted hero weight/tracking and card typography. Variable fonts were downloaded from the official Google Fonts repository:

- https://github.com/google/fonts/tree/main/ofl/manrope
- https://github.com/google/fonts/tree/main/ofl/outfit

The original OFL license files are retained in apps/web/public/fonts. CSS font URLs resolve relative to the stylesheet, so connected and direct-file HTML use the same local files. Font files use explicit static allowlist entries and font/ttf MIME type; no external font service is contacted during normal page use. Existing self-only CSP font permissions remain unchanged.

Validation: `scripts\pnpm.cmd build` passed; `lint` passed; `typecheck` passed; `test` 26 passed; `test:integration` 22 passed. Browser coverage checks actual loaded font faces on connected and direct-file pages, keyboard branch folding and navigation, responsive overflow and existing access controls. Desktop screenshot visually inspected.
