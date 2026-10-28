# Adversarial design review

The local app is now implemented. See `implementation-report.md` for implementation verification; this document retains the independent design-stage review and its later specification amendments.

Reviewed the original request, `implementation-plan.md`, `concept.html`, and `solution-concept-v1.png` after the image existed. This is a design-stage review: unbuilt interactions are not implementation defects. The initial browser capture artifact was corrected before final review. References to the first concept below describe v1; v2 is the corrected deliverable.



## Revision 4 specification update

The latest clarification defines each column as an independent block stream. Section heading is an explicit text-style command; uppercase typing never creates a heading and Enter after a heading returns to body text. A line-start hyphen plus space converts to a semantic round-bullet list, with literal internal hyphens preserved. Continuation, exit, undo, paste, IME and persistence behavior are specified. The mockup now shows round bullets in both requirement columns. User-adjusted code tokens are #E57B78 foreground, #212121 fill and #2E2E2E border; they intentionally differ slightly from the Alakazam source foreground and border. One-column mode removes the vertical divider and stacks the complete streams.

Browser verification confirmed six round bullet markers, all nine code examples using the revised three color tokens, and six preserved entries through 2 → 1 → 2 column switches. The divider is absent in one-column mode and restored in two-column mode. These updates are scoped author verification, not a new independent review. The independent review below covered revision 2. Text-style commands and live bullet conversion are implementation requirements and cannot be verified from the static mockup.

## Revision 3 specification update

The user subsequently changed the design: descriptions must now be centered, component resizing from every edge and corner is required, prose sections must omit automatic R/C/G keys and colored badges, and paired single backticks must create salmon-on-charcoal inline code. These instructions supersede the earlier left-alignment coverage note and the recommendation to defer manual resizing. The implementation plan and v3 image have been updated accordingly.

The primary author checked all nine description anchors, eight visible resize handles on the selected component, zero requirement badges, and nine inline-code examples. Browser-computed code colors match the coding Approach tokens: foreground #DE8481 and background #212121. The plan now specifies resize hit targets, gesture priority, opposite-edge anchoring, minimum size, undo/cancel behavior, saved width/height, and the input/editing/persistence behavior of paired backticks. Existing v2 routing and connection-dialog corrections remain in place. This is a scoped revision verification; the independent review below covers the earlier v2 concept. The revised gestures and text conversion still await application implementation.

## Final disposition

All five findings below are resolved at the design/specification stage. The primary author independently verified the findings, corrected the image and plan, and the adversarial reviewer rechecked the final v2 image and revised plan.

| Finding | Resolution |
| --- | --- |
| Connector hidden behind Redirect Service | Routed through the corridor above the card; all 9 illustrated paths checked against all 9 node interiors |
| Duplicate connection shown as creatable | Dialog now depicts a new Async Link Service → Analytics Queue relationship labeled link.created |
| Neutral dropdown names | Names and selected field values now use their component colors, with chips retained |
| Incomplete keyboard placement flow | Enter/Space places a node in a free cell near the viewport center; node navigation, movement and editing keys are defined |
| First release too broad | Advanced formatting, Arrange, manual width resizing, group dragging and tab duplication/reordering deferred |

The final browser inspection verified four content sections, eight palette templates, the #101213 page background, Poppins title / Inter prose / JetBrains Mono diagram font roles, colored destination names and six preserved requirement entries across 1/2-column switches. The image includes all requested major UI elements. The static concept illustrates saving, diagram editing, connections and tab management; those features have not been implemented or runtime-tested. The final review found no remaining blocker among its original findings.

## Findings in the first concept

### P1 — A connector is hidden by another component

- **Requirement:** Connect components using Arceus routing rules; the plan additionally promises clearance around unrelated cards and no silent card-crossing routes.
- **Trigger:** Read the completed example's Link Service → Link Store connection.
- **Consequence:** Its line enters the left side of Redirect Service, disappears behind that card and reappears on its right. Readers can mistake the graph for Link Service → Redirect Service → Link Store; the intended source-to-target relationship is ambiguous.
- **Evidence:** In `concept.html`, the path begins `M372 366H840…`; Redirect Service occupies x=504–770, y=326–406. Therefore its first segment intersects the card at y=366. The SVG paints the card after the edge. The first screenshot visibly shows the resulting interrupted line. Arceus `web/vendor/alakazam/bandlayout.py:567–622` explicitly scores intervening boxes, and `:1011` defines orthogonal rounded routes; `web/diagram.py:445–461` confirms current topology edges use neutral solid sync and amber dashed async.
- **Repair:** Route this connection through an unoccupied corridor, preserving distinct ports and rounded corners. Check every example path against unrelated card bounds before recapturing. Do not change the correctly chosen sync/async colors.

### P2 — The connection detail demonstrates a duplicate that its own plan rejects

- **Requirement:** A coherent connection flow; the plan rejects identical source/target/mode connections.
- **Trigger:** Open the illustrated connection dialog with Link Service selected and choose Link Store in Sync mode.
- **Consequence:** The detail shows an enabled **Create connection** action for an edge already present in the completed graph, suggesting an invalid action succeeds.
- **Evidence:** The main SVG already contains the Link Service → Link Store sync path above. The modal has From=Link Service, To=Link Store, Sync active and an enabled primary Create connection button. The optional relationship label does not change the plan's duplicate key.
- **Repair:** Illustrate **Edit connection / Save changes** for that existing edge, choose a genuinely new relationship, or show the duplicate error and disabled Create state. This finding concerns the depicted state, not unimplemented validation code.

### P2 — Dropdown names do not carry the requested component colors

- **Requirement:** The user explicitly asked for a dropdown “with component names in their component colors” and alphabetical component groups.
- **Trigger:** Inspect any destination option.
- **Consequence:** Only the small color chip identifies the component color; the name itself does not satisfy the requested treatment.
- **Evidence:** `.option` sets all text to `#d0d5d9`; the per-component accent is applied only to `.color-dot`. Group and member ordering is correct. The written plan likewise promises chips rather than colored names.
- **Repair:** Tint the option names using a readable version of their respective component accent, retaining the chips and written group names so color is not the sole identifier. Apply the same styling to the selected From/To values.

## Specification refinements before implementation

### P2 — Keyboard placement is asserted but not specified

- **Requirement:** The plan's accessibility gate promises keyboard-only creation and labels click-to-place as a keyboard alternative.
- **Trigger:** A keyboard user focuses a palette template and presses Enter.
- **Consequence:** The next documented step is clicking the grid; there is no specified keyboard location selection or commit action. The implementation team cannot demonstrate the claimed complete keyboard flow from this specification.
- **Evidence:** Architecture canvas paragraph: “Clicking a template enters placement mode; clicking the grid places it … This provides a touch and keyboard alternative to dragging.” The remaining keyboard checklist does not supply the missing placement mechanics.
- **Repair:** Define Enter/Space on a palette item as placing one component at the visible canvas center and focusing its name, or define a keyboard cursor with arrows/Enter/Escape. Also define keyboard node navigation and movement. This is a plan gap, not a verified runtime failure.

### P3 — Several useful extras obscure the first release boundary

- **Requirement:** The user asked for a simple manual editor with the specified layout and flows.
- **Trigger:** Turn the seven-phase plan into the first implementation backlog.
- **Consequence:** Auto-arrange, width resizing, group dragging, tab duplication/reordering, rich formatting and custom obstacle routing can expand the work considerably without an explicit minimal-release boundary.
- **Evidence:** Architecture, bottom-page and ordered-task sections make these additions part of the same delivery. None is a direct contradiction of the user's request, and recovery is justified.
- **Repair:** Keep the requested editing, diagram creation/connections, independent pages, undo, local save and export in the first release. Mark advanced layout controls and page-management conveniences as optional follow-ups. Do not defer safe deletion or loss recovery merely to simplify the schedule.

## Safeguards already planned, not proven

Stable IDs preserve renamed connections; text editing and dragging are separated; deletion is undoable; node deletion includes incident edges; tabs preserve separate bodies; autosave has failure states and export; imports are validated; multi-tab writes detect conflict. These substantially address data-loss risk. They cannot be verified from a static image and must remain acceptance gates, not claims of completed behavior.

Likewise, selected-node hit areas, icon labels, focus trapping/restoration, contrast at the final rendered size, long-name wrapping, IME handling, mobile overflow and route calculation on crowded graphs require the implemented UI. The first concept uses 12-unit node descriptions while the plan proposes 13–14px; check the final viewport rendering for readability before settling typography. No runtime accessibility defect is claimed here.

## Coverage that is present

The concept and plan account for the Mac shell background/font roles, upper-left editable title, broad first container and both column buttons, second section, architecture container/grid, eight colored template types, centered names and left-aligned descriptions, selected-node delete/connect controls, Sync/Async → From → To field order, grouped alphabetical destination choices, GENERAL and a plus tab affordance, and independent bottom-page content. The extra example tabs represent completed authoring; the plan correctly starts a blank document with only GENERAL. The connection dialog is clearly labeled as a separate interaction close-up rather than part of the authored solution.
