# Implementation report

Completed the first local application release on 2026-10-28 in `sys-design-tool`. Alakazam and Arceus production source files were used as references and were not edited.

## Delivered

The running React/TypeScript app replaces the static concept as the authoring surface. It includes editable document and section titles, four independent framing editors in one/two-column layouts, explicit uppercase headings, automatic round bullets, the approved inline-code treatment, eight component templates, canvas placement and dragging, every-edge/corner resizing, centered editable component text, group regions, zoom/pan/Fit, synchronous/asynchronous connections, a colored grouped component picker, connection editing/deletion, and independent note pages.

Recovery includes command-level undo/redo, node deletion with incident edges in one transaction, page deletion recovery, local IndexedDB autosave, a previous-save fallback, JSON import/export with structural validation, and atomic revision checks plus an explicit multi-tab conflict flow. A blank document is the default; the URL-shortener design is available through Load example.

## Framing and reset update

The top card now starts with Goal and places Requirements above Key Ideas on the left, Guarantees above Scale/Constraints on the right. Titles and their half-pixel divider lines use the Mac renderer's exact framing accents: `#7DB4F4`, `#B99AE8`, `#81C784`, and `#E5B567`. Plain circle bullets replace category IDs or badges.

Autosave continues without a visible status indicator. Reset replaces the visible Undo/Redo controls and clears all authored content, custom pages, nodes, connections, title, and viewport back to the structured blank document. Keyboard undo remains available until reload. Actionable storage/conflict errors remain visible.

Component descriptions now use 14px with 21px line spacing in both display and editing states, following a second small increase from 13.5px. Minimum-height calculations use the same font size and line spacing to account for wrapping; text stays centered.

Schema version 2 stores the four subsection editors separately. Version-1 drafts/imports migrate without discarding prose or formatting: recognized headings select a section, while unknown headings remain intact. A legacy combined Scale & guarantees block stays together under Guarantees; splitting its meaning would require guessing. The refreshed example fills all four sections separately.

Browser checks for this update verified all four editor input rules and independent persistence, silent autosave, one-column stacking, Reset clearing every editor/graph/custom page and persisting after reload, keyboard recovery before reload, exact heading/line colors, 13.5px centered descriptions in display/edit modes, and text bounds inside all nine example components. Desktop (1440px) and phone (390px) checks found no page-wide horizontal overflow. `design/app-framing-v2.png` captures the updated real app.

## Verification

- Production TypeScript check and Vite build pass.
- Automated tests cover live editor input rules, explicit heading transitions, pasted lists and code spans, all eight resize directions and anchoring, word-aware minimum sizes, document validation, edge validation and deletion recovery, history grouping, safe routing for the example and a 30-component graph, parallel/reverse routes, unresolved overlapping endpoints, atomic saving, stale-writer rejection, and recovery from a damaged current record.
- Browser checks passed for live heading/bullet/backtick typing, plain uppercase text, column switches, separate note-page contents, keyboard component creation and editing, native palette drag/drop, node dragging, corner resizing at non-unit zoom, size controls, connection creation and duplicate prevention, grouped colored choices, component/edge deletion with undo, and gesture undo/redo.
- Reload preserved the tested document's prose, nodes, manual sizes, connections, zoom and pan exactly.
- Two-tab verification confirmed that an unsaved competing edit could not overwrite a newer saved version; Load latest version restored the persisted version.
- Responsive checks at 1440px, 768px and 390px found no page-wide horizontal overflow. The phone toolbar was corrected to wrap, and the palette remains horizontally scrollable. Large diagrams support zoom/pan on a small screen.
- `design/app-implemented.png` is a browser capture of the real application at 1440px, rather than the earlier static mockup.

The automated suite has **33 passing tests** across four files. These checks are implementation verification by the primary author; the earlier independent adversarial review in `adversarial-review.md` covers the design stage.

## Verification limits

The browser automation tool denied the local file chooser while exercising Import JSON. That chooser-to-file path was not verified end to end. The application import handler is implemented, and document validation/round-trip behavior is covered by automated tests. Export's native download interaction was not separately exercised. Storage-denial UI, IME behavior and physical touch gestures were not exhaustively tested on real devices.

Vite reports a nonblocking bundle-size warning (approximately 218 KB compressed JavaScript) and an upstream Tiptap `use client` directive warning. This is a client-only local app; the production build succeeds.

Advanced automatic layout, group dragging, tab duplication/reordering, cloud sync and collaboration remain outside the approved first-release scope. Connections whose endpoints overlap are explicitly marked as needing room instead of drawing a misleading line through components.

## Launch

Run `npm run dev` from the project directory, or open `start.command` on macOS. The local URL is `http://127.0.0.1:5179/`. The temporary verification server is stopped after handoff; the launcher starts a fresh server. Refer to `README.md` for controls and backup instructions.
