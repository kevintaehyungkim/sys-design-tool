# System design tool implementation plan

Create a manual system-design editor at `/Users/taehyungkim/Documents/code/sys-design-tool`. The page should feel like Alakazam's Mac system-design solution, with Arceus architecture components, while letting the author start with a blank document. This delivery covers the construction plan, a completed-solution concept image, and an adversarial design review. The image was rendered from a local HTML/CSS concept after the built-in image generator failed twice with network errors. The first local application release is now implemented. See `implementation-report.md` for delivered scope, verification and remaining limits; the design-stage notes below are retained as history.

## Scope and defaults

- A local browser app with one active design document, editable prose, a diagram, and independent note tabs. Proposed implementation: React and TypeScript, CSS tokens, HTML node cards, and an SVG connector layer. No account, model call, server database, or collaboration is needed for the first version.
- Interpret `/code` as the existing `/Users/taehyungkim/Documents/code` folder. Keep the new tool independent of Alakazam and Arceus runtime services.
- The two unnamed sections above the diagram default to **Requirements** and **Design approach**. Their headings and content are editable, so the author can use different organization.
- Start with an empty title, empty sections, an empty canvas and exactly one **GENERAL** tab. The completed URL-shortener solution is demo content only, available through an explicit Load example action.
- The top card's layout switch affects only that card. A tab creates another content page inside the bottom container; it does not duplicate the whole design or diagram.

## Exact visual references

Use the Mac shell background, not the older warm-black personal viewer background. Copy the existing font assets and retain their available license notices; verify redistribution rights before packaging any asset with a missing notice.

| Role | Value or source behavior |
| --- | --- |
| Page background | `#101213`, from Alakazam `src/desktop/shell_ui.py` |
| First content card | `#0F1011` fill and `#23252A` border |
| Other section cards | `#0D0D0D` fill and `#2B2F34` border |
| Main title | Poppins Bold; source ink `#D5D5DA` |
| Section headings | Poppins Regular, white; no trailing periods |
| Prose | Inter Regular, main ink `#CFD1D1` |
| Controls and small application text | DM Sans |
| Diagram labels and component text | JetBrains Mono; primary `#E6E5E1` |
| Code blocks | Fira Code |
| Inactive tab | `#191B1A` fill, `#AEB8BD` text |
| Active tab | `#293B30` fill, `#C9E9CD` text |
| Focus accent | `#82DFB6` |

Document sizes in Alakazam are measured on a 2000px canvas. Translate them to normal responsive CSS sizes rather than applying its full-document transform to an editor. Initial desktop targets: title 30px, section labels 15px, body 15–16px, node names 16px, node descriptions 13–14px. Use 24–32px outer gutters, 16px section gaps, approximately 10–12px card radii, and no fixed narrow reading-column cap. Measure readability at 100% zoom and portrait tablet width before fixing sizes.

Arceus component ramps are authoritative:

| Group | Accent | Border | Gradient top → bottom |
| --- | --- | --- | --- |
| Clients | Blue | `#5E8FD6` | `#122238` → `#0A1422` |
| Serving plane | Purple | `#8580C2` | `#221A3A` → `#1A142F` |
| Event processing | Plum | `#BC77D4` | `#331830` → `#1F0A1D` |
| Event worker variant | Rose | `#C65D7E` | `#3B1B23` → `#1A0A10` |
| Data stores | Teal | `#5DCAA5` | `#0A1F1C` → `#040E0D` |
| Cache variant | Green | `#63A860` | `#161E15` → `#080C08` |
| Control plane | Orange | `#E8A15C` | `#231705` → `#0D0702` |
| Operations | Gray | `#7D7C78` | `#20201E` → `#121211` |

Regions use a very faint tint, a quiet group-colored outline and a group label above their boundary. Arceus uses 0.055 fill opacity and 0.22 border opacity. The editor grid is a new requested feature: white dots at about 5% opacity, with a 24px spacing at 100% zoom. Component names and descriptions are both center-aligned, including on client cards. Descriptions remain smaller and quieter than names. This supersedes the original left-aligned description requirement.

## Page and interaction specification

### Title and top content

Place the document title at the top left immediately above the first full-width container. Clicking it enters an inline input with a visible focus state; Enter or blur commits, Escape cancels. Empty titles display an Untitled system design placeholder without storing that placeholder as authored content.

The first card has its editable section heading at the upper left and two actual buttons at the upper right: **1 column** and **2 columns**, with icons, tooltips and `aria-pressed`. Two columns is the desktop default. Maintain two logical content groups; one-column mode stacks A then B, and switching back restores both groups without parsing or losing text. On a narrow screen the layout stacks automatically while preserving the user's desktop preference. Each group supports paragraphs, bullets, numbered lists and short headings through a small formatting toolbar. Text and content-group headings remain editable in both modes. These prose containers use ordinary text and bullets: no automatic R1/R2/C1/C2/G1 identifiers or category-colored badges. The same rule applies to Design approach and every bottom tab page; diagram component colors and tab selection colors remain unchanged.

The second full-width section follows directly below. It supports the same text blocks and an editable heading, defaulting to Design approach. Its default content is a single column. A small add-block control appears on focus or hover, with a keyboard-accessible equivalent.

### Explicit headings and independent columns

Each requirement column is its own ordered stream of blocks, rather than a newspaper layout that automatically flows text into the next column. A column can contain any number of headings, paragraphs and lists. FUNCTIONAL and SCALE & GUARANTEES are editable example headings, not fixed categories. One-column mode stacks the complete left stream above the complete right stream and removes the vertical divider. Switching back restores ownership and order; adding or editing a heading never moves content between columns. At narrow widths use the same stacked treatment.

A small contextual text-style menu offers **Body text**, **Section heading**, **Bulleted list** and **Numbered list**. It appears when the editor is focused and has a keyboard-accessible toolbar entry. To add an all-caps title, start a new block, choose Section heading, and type its title. To convert an existing line, place the caret in that line and choose Section heading. Display heading text in uppercase using styling while retaining the authored text and an explicit heading block type. Typing capital letters alone never creates a heading. Normal text and bullets preserve the user's casing.

Enter at the end of a heading starts a normal paragraph below it; it does not create another heading. Enter within a heading splits it, with the remainder becoming body text. A new heading only begins when the author explicitly selects Section heading. The same text-style choices apply in Design approach and every bottom tab page. Keep the card-level title separate from these optional internal headings.

### Round bullets while typing

Across the two upper prose cards and every bottom tab page, typing a hyphen followed by a space (`- `) at the beginning of an otherwise empty paragraph converts that prefix immediately into a round bullet (`•`). The prefix is removed from the authored text and the caret stays ready to type the first item. Treat this as list formatting, not replacement of every hyphen character. Hyphens inside words, negative values and inline code remain literal; a hyphen without the following space also remains literal. Do not run the shortcut inside a heading or code span.

Enter continues a nonempty bullet list with another round bullet. Enter on an empty item exits to body text. Backspace at the start of an empty bullet removes its list formatting. Undo immediately after automatic conversion restores the typed `- ` prefix; defer conversion until IME composition ends. Convert pasted plain-text lines beginning with `- ` into list items, and preserve adjacent ordinary paragraphs and inline-code formatting. Rich pasted lists retain their list structure. Keep bullets round at any supported nesting depth. Store lists as structured blocks, preserve them across column switches, tab switches, save/reload and JSON import/export, and use semantic list markup for accessibility.

### Inline code while typing

All prose editors in the two cards above the diagram and every page below it share inline-code behavior. Typing an opening single backtick, text, and a closing single backtick converts the enclosed text into an inline code span immediately after the closing delimiter. For example, typing `` `GET /:code` `` displays the text GET /:code in the styled code span; the delimiter characters are hidden in the rendered view. The code span is authored formatting, not an automatically generated requirement badge.

Use the user-adjusted coding chip style: a slightly more saturated salmon foreground `#E57B78`, unchanged charcoal fill `#212121`, and a slightly darker hairline border `#2E2E2E`, with a small 3–4px radius, compact horizontal padding and a monospace face. The starting reference is Alakazam's coding Approach chip (`src/coding/interactive_coding.py` `_APPROACH_CHIP_*`): foreground `#DE8481` and border `#373737`. Revision 4 intentionally adjusts those two tokens at the user's request; other coding cards use a different boxless rose treatment. Keep ordinary prose neutral. Do not automatically assign colors to words, requirement numbers, or system components in these prose sections.

An unmatched backtick stays literal while typing. Empty pairs do not create empty chips. Matching stays within one paragraph/line; escaped backticks remain literal. Three-backtick fences do not trigger this single-backtick input rule. Defer conversion during IME composition. Preserve the caret after conversion so following text continues outside the span. Code contents remain editable; Right Arrow at the end exits the span. Undo can restore the original typed delimiters. Rich paste, column changes, page changes, save/reload and import/export must preserve code marks and text. Store typed inline runs as text or inlineCode marks in the block model, not raw user-supplied HTML. Incomplete delimiters must survive persistence as ordinary text.

### Architecture canvas

The third container has a System architecture heading, then a top strip of draggable component templates: Client, Service, Data store, Cache, Event queue, Worker, Control, Operations. Each template uses the correct accent; group identity is also written, so color is not the only signal. Keep the palette horizontally scrollable at small widths. A brief empty-state hint explains dragging and click-to-place.

Dragging a template shows a ghost preview and creates exactly one component on a valid drop. Dropping outside cancels. Clicking a template enters placement mode; clicking the grid places it. Escape cancels placement. This provides a touch alternative to dragging. Keyboard flow: focus a palette item, press Enter or Space to place one node in the first unoccupied grid cell nearest the visible canvas center, then focus its name. Tab moves between nodes and their controls; when a node frame is focused, arrow keys move it by one grid step (Shift+arrow moves four steps), and Enter edits its name. Escape exits editing or cancels a pending operation. Arrow keys inside text fields keep normal caret behavior. The new component is selected and its name is focused.

Each node has a stable UUID, group, optional subtype/accent, canvas coordinates, width and height, centered editable name and centered editable description below it. A selected node shows subtle delete and connection-arrow buttons above its upper-right edge, with approximately 65% idle opacity and full opacity on hover/focus. Click text to edit; drag the card interior outside its editable text or its move grip after a movement threshold. Press-drag any of the four edges or four corners to resize; borders are reserved for resizing, not moving. Text selection and typing must never drag the card. Name edits commit with Enter; description accepts newlines and commits with blur or Cmd/Ctrl+Enter. Escape restores the previous value. Text edits rewrap within the current width and increase the minimum height when needed. Moving and resizing update connected endpoints and routes, then recompute the enclosing region bounds.

Use a minimum card width around 190px and a content-derived minimum height; never allow resizing to clip the name or description. Resizing is required in the first release. Each selected card shows eight subtle resize handles (four corners and four side midpoints), and the whole length of every edge is a resize target. Use a fixed screen-space hit band of about 8px around edges, enlarge it for touch, and show directional resize cursors. Corners change width and height; edges change one dimension. Anchor the opposite edge/corner so resizing from the top or left updates both position and size. Pointer capture keeps the gesture stable outside the card. Hit priority is action button or editable text, then corner, then edge, then interior drag. Escape cancels a drag/resize and restores the original rectangle; pointer cancellation must not leave a partial transaction. Record a completed drag or resize as one undoable action. A keyboard-accessible Size command exposes width/height fields as an equivalent to pointer resizing. Support correct canvas-coordinate conversion at every zoom level and preserve manual dimensions after save/reload. Unique, trimmed, case-insensitive names keep the connection menu unambiguous; reject a conflicting rename inline without losing the draft. Edges always reference IDs, never names.

Group membership supplies the color and a faint enclosing region. Region bounds derive from their member nodes; deleting the last node removes an empty region. Default placement and the optional Arrange action follow Arceus: Clients at top, Serving plane below, Event processing below that, Operations at bottom; Data stores on the right, Control plane below Data stores. Direct dragging preserves the author's position. Arrange is explicit and undoable, never triggered just because text changes. Group dragging is an optional follow-up; changing group is an explicit node-menu action, not an accidental consequence of crossing a boundary.

First-release canvas controls: zoom out/in, zoom percentage and Fit. Arrange is an optional follow-up. Wheel scroll continues to scroll the page; use a documented modifier for zoom. Space-drag or the pan tool moves the canvas. Keep node controls usable while zoomed. Fitting content must not make the lower tab container disappear; canvas viewport height stays bounded, with a desktop default near 600px and an expand control.

### Connection modal and routing

Click a selected node's arrow button to open a compact dialog titled **Connect components**. Order its controls exactly as requested: Sync/Async segmented toggle, From field defaulted to this node, then To dropdown. From may be changed using the same picker. Include an optional relationship label, Cancel, and Create connection. Sync is the initial default. Show a solid/dashed line sample beside each mode.

The To menu is a searchable custom listbox grouped alphabetically: Clients, Control plane, Data stores, Event processing, Operations, Serving plane. Within each group sort component names alphabetically. Every option has both a component-color chip and its name tinted in that component color; lighten an accent only if needed for readable contrast. The selected From/To names use the same color treatment. Omit empty groups. Exclude the selected source and disable Create until a destination exists. If no other node exists, explain that a second component is needed. Escape cancels; focus stays inside the dialog and returns to the originating arrow button on close.

Preserve Arceus arrow rules: orthogonal routing, gently rounded corners, open chevron arrowheads, solid synchronous paths and dashed asynchronous paths. Use source/target boundary ports, separate parallel routes, reserve clearance around other nodes and labels, and draw edges behind nodes. In the unselected state use neutral `#CCCAC4` for sync and amber `#EF9F27` for async, as the Arceus topology legend specifies. Named-flow colors in the older flow renderer are a different layer and are not implied by choosing sync/async. Optional flow highlighting can be added later if wanted.

Use a deterministic obstacle-aware route calculation for the manually placed geometry. Treat 12-unit bend radius, 2.5-unit stroke and open-arrow proportions as reference values at canvas scale. Keep visible endpoints stable during movement and recalculate after edits. Do not treat a library's generic smooth-step path as proof of matching Arceus. If no safe route fits, show a clear unresolved-route state and allow repositioning; never silently draw a connector through a card.

Click an existing edge to select it using a generous invisible hit area. Offer Edit connection and Delete. Editing reuses the same modal with fields populated. Reject exact duplicate source/target/mode connections; opposite directions remain distinct. Support cycles with separate ports and exterior routes. Self-connections are excluded in the first version. Delete a node and its incident edges as one undoable transaction, with a toast stating how many connections were removed. Escape deselects before any destructive action; Delete/Backspace shortcuts operate only when no text input is focused.

### Bottom pages

Place a fourth full-width container below the architecture canvas. It starts with the **GENERAL** tab at the upper left and a small **+** immediately after the last tab. The plus is always faintly visible and becomes brighter on hover/focus; its label is Add page. It creates a blank page, adds a new tab, activates it and focuses its name field. This is a new tab with its own body, not a new paragraph under GENERAL.

Use the Mac solution tab colors and compact uppercase labels. GENERAL starts active. New tabs support rename and delete through a small contextual menu. Reordering and duplication are optional follow-ups. Keep GENERAL undeletable as the default landing page. Prevent blank or duplicate page names. Each page independently stores its text blocks. Switching tabs preserves the current edit. Deleting a nonempty page is undoable and activates the nearest remaining tab. The tab bar scrolls horizontally when needed and scrolls the active tab into view. Arrow keys navigate tabs, Enter activates, and tab focus/selection are distinct.

## State and persistence

Store a versioned document rather than serialized DOM:

```text
DesignDocument
  schemaVersion, id, title, updatedAt
  requirements: { heading, preferredColumns, groups: [A, B] }
  approach: { heading, blocks[] }
  group: { id, blocks[] }
  block: paragraph | sectionHeading | bulletList | numberedList
  paragraph/sectionHeading: { id, runs[] }
  list: { id, items[] of { id, blocks[] } }
  inline run: { type: text | inlineCode, text }
  nodes[]: { id, groupId, subtype, accent, name, description, x, y, width, height }
  edges[]: { id, sourceId, targetId, mode, label }
  pages[]: { id, title, blocks[] }
  activePageId, viewport: { x, y, zoom }
```

Keep transient selection, dialogs and drag previews separate. Use a pure reducer with command-level undo/redo: a full drag or resize is one command; continuous text typing coalesces sensibly. Keep browser text undo active inside editors and document undo outside them. New, load example, import, tab deletion and graph deletion are recoverable operations.

Autosave the document after a short debounce into IndexedDB, display Saving / Saved locally / Save failed, and keep the in-memory draft if storage fails. Include JSON export/import from a small document menu; validate the schema and all references before replacing data. Export always remains available if local storage is unavailable. Offer recovery of the last valid document after an interrupted write. A second browser tab must not silently overwrite a newer revision: detect an active writer and show a reload-or-copy choice. Browser storage can be cleared; Saved locally is not a cloud backup.

These implementation primitives are supported by the official [React reducer documentation](https://react.dev/reference/react/useReducer), [IndexedDB documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), and [Pointer Events documentation](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events). Keep user text as text, sanitize rich pasted content, and validate imported JSON before rendering.

## Ordered construction tasks and acceptance gates

| Phase | Concrete tasks | Gate before moving on |
| --- | --- | --- |
| 1 Foundation | Create the separate app, define document types, copy audited font assets, implement palette tokens and the four-section page shell | Background, fonts, widths, card borders and tab colors match the reference; no dependency on running Alakazam |
| 2 Writing | Inline title, explicit heading/body blocks, automatic round bullet lists, unbadged prose, paired-backtick code spans, two logical requirement groups, 1/2-column buttons | Headings start only by explicit command; Enter returns to body text; line-start hyphen-space converts to round bullets; title, lists and inline code persist; paired backticks style correctly; repeated column toggles preserve all blocks and marks; empty/long/pasted content remains readable |
| 3 Diagram components | Palette, valid drop/placement, node editing, selection controls, dimensions, group regions, zoom/pan/Fit | One drop creates one node; editing never drags; names and descriptions stay centered; all edges/corners resize correctly; move/resize stays accurate under zoom |
| 4 Connections | Modal, grouped colored picker, validation, edge selection/edit/delete, obstacle-aware orthogonal routing | Source is prefilled, ordering is correct, solid/dashed styles match, renamed/moved nodes retain edges, no card-crossing routes |
| 5 Pages | GENERAL and plus, isolated tab bodies, rename/reorder/duplicate/delete, overflow navigation | New tabs are blank and independent; content survives switches; GENERAL remains present |
| 6 Recovery | Undo/redo, autosave and error states, JSON import/export, example loading, multi-tab conflict handling | Refresh restores the document; node-delete undo restores all edges; export/import round trip is lossless |
| 7 Verification | Browser interaction tests, reducer/geometry tests, accessibility and visual review with the example and adversarial fixtures | All requirements below pass at desktop, tablet and narrow width; known limits are documented |

Suggested file boundaries: `src/theme/`, `src/model/`, `src/editor/`, `src/diagram/`, `src/pages/`, `src/storage/`, `src/examples/`, and `tests/`. Keep route geometry independent of UI components so it can be tested with deterministic fixtures. Avoid copying the solver, backend persistence or generation pipeline.

## Verification checklist

- Visual: compare the exact background token, loaded font roles, card treatment, every component ramp, region opacity, line style and active tab treatment against the source. The concept image communicates the intended design; the built UI requires browser screenshots and computed-style checks for exact fidelity.
- Editing: explicit heading insertion/conversion, uppercase body text, Enter at/end within headings, multiple headings per column, stable column ownership, hyphen-space conversion, literal hyphens/negative values/code, bullet continuation/exit/undo, plain/rich pasted lists, round nested markers, paired/unmatched/escaped/empty backticks, multiple code spans, subsequent plain typing, code editing/undo, multiline and IME input, inline-code persistence across columns/tabs/import, blank title, 100-character title, long unbroken node name, multiline description, emoji/IME input, pasted lists, cancel, blur, and rapid column toggles.
- Diagram: zero/one/30 nodes, repeated drops, drop outside, touch placement, pan/zoom coordinates, narrow view, all four edge and four corner resizes, minimum size, opposite-edge anchoring, zoomed resize, resize cancellation, undo and reload restoration, overlap recovery, disconnected nodes, reverse edges, cycles, crowded paths and multiple edges near one port.
- Modal: correct source, no-target state, alphabetical groups and members, color chips plus text, search, invalid duplicate, source/destination changes, Escape and focus restoration.
- Pages: multiple tabs, long names, duplicate names, overflow, rename while editing, rapid switching, deletion/undo, and independent content restoration after reload.
- Recovery: storage denied/full, malformed import, dangling edge references, interrupted save, multi-tab edits, JSON round trip, and delete-undo-redo consistency.
- Accessibility: keyboard-only creation/editing/connection flow, visible focus, labeled icon buttons, touch hit areas, usable contrast and reduced-motion support. Test at 1440px and 1280px desktop, 768px tablet and approximately 390px mobile; prioritize tablet reading without shrinking all text to fit.

## Concept image brief

Show a fully authored **URL shortener** on a tall desktop page: a two-column Requirements card, Design approach, a large dotted architecture canvas with the full colored template strip, then GENERAL with two added tabs and a plus button. Diagram components: Web client, API Gateway, Link Service, Redirect Service, Link Cache, Link Store, Analytics Queue, Analytics Worker, Analytics Store. Include named Clients, Serving plane, Event processing and Data stores regions. Show a selected Link Service with delete and connect icons. Include a clearly labeled separate interaction detail for the connection modal and its grouped destination menu so the main completed diagram stays readable. After review, the detail illustrates adding a new Async Link Service → Analytics Queue connection labeled link.created. It is not already present in the completed diagram; the author has changed the initial Sync default to Async.

Example behavior: create immutable short links; redirect through cache then durable store; send redirect analytics asynchronously through a queue to a worker and analytics store. Requirements can state 10M new links/day, 100:1 redirects to writes, p99 redirect under 50ms and 99.99% availability as authored design targets, not proven results. GENERAL explains caching, ID uniqueness and idempotency; additional example tabs can be Data model and Failure modes.

## Source map

- Alakazam shell and tab overrides: `/Users/taehyungkim/Documents/code/alakazam/src/desktop/shell_ui.py`, `DESKTOP_SHELL_CSS` and `DESKTOP_SEGMENTED_CSS`.
- Inline-code chip tokens: `/Users/taehyungkim/Documents/code/alakazam/src/coding/interactive_coding.py`, `_APPROACH_CHIP_BG`, `_APPROACH_CHIP_BD`, `_APPROACH_CHIP_FG`.
- Solution font mapping: `/Users/taehyungkim/Documents/code/alakazam/src/viewer/viewer_ui.py`, `FONT_CSS`.
- Solution surface tokens and geometry: `/Users/taehyungkim/Documents/code/alakazam/src/design/design.py` and `src/design/interactive_design.py`, `css_tokens`.
- Current solution layout rationale: `/Users/taehyungkim/Documents/code/alakazam/docs/design-render.md`.
- Arceus semantic groups and edge modes: `/Users/taehyungkim/Documents/code/arceus/shared/design.py`, `LANES`, `LANE_ACCENTS`, `Edge`.
- Arceus ramps: `/Users/taehyungkim/Documents/code/arceus/web/vendor/alakazam/color/colors.json`.
- Arceus region/routing/render behavior: `/Users/taehyungkim/Documents/code/arceus/web/vendor/alakazam/bandlayout.py`, `COLOR_REGION`, `CONTAINER_OF`, `_edge_path`; `web/diagram.py`, `render_annotated_svg`; `frontend/src/components/diagram/DiagramCanvas.tsx` for the sync/async legend.

## Adversarial review handoff

After the concept image is produced, independently review this plan and that image against every original user requirement. Distinguish visible defects, specification gaps, deliberate proposed defaults and interactions a static image cannot verify. For each finding name the violated requirement, trigger, visible consequence, supporting evidence, severity and concrete repair. Inspect in particular the full-width layout, precise title placement, both column buttons, second section, all palette groups, centered name/description alignment and all-edge/corner resizing, selected-node controls, modal field order, grouped alphabetical colored dropdown, connector geometry and independent bottom pages. Review empty, long-content, keyboard, destructive, save failure and crowded-graph states. Merge verified findings into a follow-up addendum without claiming an unbuilt interaction has passed.


## Review resolutions and first release boundary

The adversarial review was started immediately after the first image capture. Three verified concept defects were repaired in the final v2 image: the Link Service → Link Store connector now travels above Redirect Service; the dialog depicts a new relationship rather than creating a duplicate; and destination names carry their component colors, not just adjacent color chips. Keyboard placement now has explicit Enter/Space, movement and edit behavior.

The first release includes all requested controls and sections, simple paragraphs/bullets with authored inline code, manual node placement, dragging, all-edge/corner resizing and editing, colored groups, accurate connectors, the connection dialog, independent tabs, keyboard access, undo/redo, local autosave and JSON export/import. Keep advanced formatting, auto-arrange, group dragging, tab duplication/reordering, named multi-edge flow filters, cloud sync and collaboration outside the first release. These additions must not delay the requested authoring experience. Obstacle-aware connection routing and deletion recovery remain first-release requirements because they protect diagram meaning and authored work.

The saved HTML is an inspectable visual concept with an editable title and a working column switch only. Its diagram, notes tabs, save indicator and dialog are illustrated states. No application feature is claimed complete from those visuals. Implementation tests and browser checks in Phase 7 remain required.


## Revision 3 user changes

The latest user instructions replace left-aligned node descriptions with centered descriptions, make dragging and resizing from any component edge/corner first-release requirements, remove automatic requirement keys and colored prose badges from the sections above and below the diagram, and introduce paired-single-backtick inline code in those prose editors. The v3 image shows centered descriptions, eight selection resize handles and sample salmon-on-charcoal inline code. Pointer gestures and live input conversion are specified for implementation; the visual concept does not claim to implement those behaviors.

## Revision 4 text behavior and chip adjustment

Clarify that the top card has two independent block streams. All-caps headings are explicit Section heading blocks, never inferred from text casing; Enter after a heading starts normal body text. All prose editors convert a line-start hyphen plus space to a round bullet with standard continuation, exit, paste and undo behavior. The v4 concept now uses round bullets in both requirement columns and applies the requested darker inline-code border (#2E2E2E) and more saturated salmon text (#E57B78). The charcoal fill stays #212121. Heading and bullet input rules remain implementation requirements, not working interactions in the static concept.
