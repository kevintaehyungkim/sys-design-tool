# System design tool

A local web app for writing a system design from scratch. It uses Alakazam's dark Mac solution theme and fonts, with Arceus component colors and orthogonal diagram arrows.

## Run

Requires Node.js 20.19+ or 22.12+ and npm. From this folder:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5179/**. On macOS, double-click `start.command` to start the server and open the app. Stop the server with Ctrl+C in its terminal. Dependencies are already installed on this workstation.

```sh
npm test       # Model, editor rules, routing and storage checks
npm run build  # TypeScript validation and production build in dist/
npm run preview
```

## Use

- Click the document title or section titles to rename them. The first card starts with Goal, then blue Requirements and violet Key Ideas on the left, green Guarantees and warm-yellow Scale/Constraints on the right. Each subsection has its own editor and a matching divider line. One-column mode stacks the sections without merging their contents.
- Focus a text area to reveal its formatting controls. Choose **Section heading** for an uppercase heading. Enter after a heading returns to body text; typing capitals does not create a heading.
- Type a hyphen and space at the beginning of a paragraph for round bullets. Enter continues the list; Enter on an empty item exits it. Paired single backticks create inline code with the approved saturated salmon text and dark border. Existing code and normal hyphens stay intact.
- Drag a template onto the canvas, or click a template and then click a position. Enter on a focused template places one in an available area. Click component names/descriptions to edit them. Both are centered; component descriptions use a 14px font with 21px line spacing.
- Drag a component's body or move icon to reposition it. Drag any edge or corner to resize. Selected components expose move, size/type, delete and connect controls. Arrow keys move a focused component; Shift increases the step.
- Use Sync/Async, From and the colored, grouped To picker to connect components. Click a connection and choose Edit, double-click it, or use the connection list in the canvas footer. If components overlap so no safe route exists, the list identifies the connection that needs more room.
- Use the hand tool or Space-drag on the canvas to pan. Cmd/Ctrl + scroll zooms around the pointer. Fit brings the whole architecture into view. On small screens, zoom and pan to read a large diagram.
- The **+** creates a separate notes page. New pages can be renamed or deleted. GENERAL remains present. Tab labels scroll horizontally.
- **Reset** clears the title, goal, all section and page contents, diagram components/connections, custom pages, and canvas view. It returns to the empty two-column layout with GENERAL. Cmd/Ctrl Z can recover the previous document until reload. Undo/Redo remain keyboard shortcuts, with no visible buttons. Within a text editor, its own keyboard undo history applies.

The app starts blank. **Document menu → Load example** opens the completed URL-shortener design. Reset, import and example loading are undoable.

## Local data

Changes save quietly to IndexedDB in the current browser and origin; routine saving/saved messages are hidden. Actionable storage-error and conflicting-tab alerts remain visible. Use **Export JSON** for a portable backup and **Import JSON** to restore it. Different hostnames, ports, browsers and profiles have separate drafts. Local browser storage is not a cloud backup.

Older version-1 drafts and JSON exports migrate automatically to the four-section layout. Recognized Functional/Requirements, Assumptions/Key Ideas, Guarantees, and Scale/Constraints headings move their content to the corresponding editor. Mixed legacy Scale & guarantees content stays together under Guarantees so the app does not guess which facts belong where; the text remains editable. Custom headings, rich formatting, diagrams, and note pages are preserved. New exports use schema version 2.

A previous successful save is retained for recovery. Atomic revision checks prevent a second tab from overwriting newer work; export the local copy or load the latest version when the conflict notice appears. If storage fails, the in-memory document remains editable and export stays available.

## Project structure

- `src/App.tsx`, `src/Editor.tsx`: document shell, text editing and notes pages
- `src/Canvas.tsx`, `src/ConnectionDialog.tsx`, `src/routing.ts`: component gestures, connections and obstacle-aware routes
- `src/model.ts`, `src/history.ts`, `src/storage.ts`, `src/useDocument.ts`: validated documents, undo and persistence
- `src/styles.css`, `public/fonts/`: theme and local font assets
- `tests/`: deterministic editor, graph, validation and storage tests
- `docs/implementation-plan.md`: approved design and construction plan
- `docs/implementation-report.md`: implemented scope and verification evidence
- `docs/adversarial-review.md`: historical independent review of the design
- `design/`: original HTML mockups and design inputs, retained separately from the running app. Preview captures (`design/*.png`) are local artifacts and are not versioned

The first release is local and uses no account, AI service, application backend or database server. Advanced auto-layout, group dragging, tab duplication/reordering, cloud sync and collaboration remain outside this release. Font assets and available notices were retained from the approved local references; review redistribution rights before publicly packaging the project.
# sys-design-tool
