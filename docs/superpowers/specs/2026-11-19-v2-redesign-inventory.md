# PTAH V2 redesign: inventory of today's features

Date: 2026-11-19. Read from the V2 code at `19f0f79` (apps/web, packages/ds). This is the checklist the redesign is held to: every line here needs a home on a new screen, and nothing new is added. Wording in quotes is today's wording; the redesign may change words, not features.

New organisation (approved): **Lights** (Venue + Library) → **Effects** (Builder) → **Show** → **Live** (Perform), with **Inspect** (Debug) and **Settings** set apart.

## 0. What the look-proof boards got wrong

The H boards were drawn before this inventory. These points differ from the real app:

- **Live has no master slider, no Hold, no White.** Its hand controls are Emergency (Restart engine, Reload show, Blackout, Freeze) and Reaper transport (Start, Stop, Go to start). Master and house lights only appear as readouts in Debug.
- **Live has two faces:** a readiness checklist before a show plays, and the board while it plays.
- **Show is a grid** (rows × lights, note chips in cells), not a list of sentences.
- **Effects has about 45 node kinds** in five families, an inspector, sticky notes, and four dock sections (Test, Preview, On the rig, From the show).
- **Venue is three things** (universes, a channel map per universe, fixtures) plus a separate Patch page.
- **The Reaper offset advice is in Settings**, not Venue.
- **There is no global status indicator** in the shell today. The "ALL WELL" mark in the H header would be new (filed in section 8).
- **Keyboard shortcuts and a ⌘K command palette already exist** on most pages, so key hints in the footer show existing features.

## 1. App shell

- Strip (40 px): "PTAH" mark; tabs Perform, Venue, Library, Show, Builder, Debug, Settings; "Stage" toggle (F2 anywhere, remembered); ⌘K hint.
- Under 600 px: only the mark and a "Commands ⌘K" button (opens the page palette on Perform, Venue, Show, Settings and a Builder program). No tabs on a phone.
- Stage mode: dimmer text and lines; fault and warn colours unchanged.
- Unknown path: "Not yet." with "Back to Perform".
- Back/Forward go through each page's leave guard.
- No global fault or connection indicator; each page shows its own. Toasts are per page.

## 2. Live (today: Perform, `/`)

### Before a show plays: readiness checklist
- Band: "Ready to load — press L" or "Not ready — N waiting".
- Eight rows, each a label, a coloured word and a reason:
  - Engine: starting / restarting / down ("no link to the engine") / up ("rt yes · level N").
  - Show: show name ("venue · patch N") / remembered name ("L to load") / "no show" ("L to choose") / —.
  - MIDI port: "Reaper connected" / "waiting for Reaper" / "port not created" / "refused by macOS" ("restarting to get it back" or "quit PTAH, wait a few seconds, start it again").
  - Clock: locked ("120.0 bpm") / free-run (red) / stopped / waiting.
  - DMX: "Art-Net · host" / "USB Pro · present" / "N / N present" / opening / "not found" ("U1, U2").
  - Universes: "sending n / N" ("U2 not sending").
  - MIDI devices: "n / N present" ("name absent +k"), or "refused by macOS".
  - Phone: URL / "local only".
- QR of the phone URL, or "local only".
- Primary button "Load show" [L]. Keys: L opens the picker, M marks.

### Show picker ("Load show")
- Show combobox ("Search shows", "No show found"); same-named shows get "· N groups, N rows". The last show used is preselected.
- Venue combobox only when several venues fit ("Choose a venue"). "No venue has a patch for this show."
- "Load", or "Restart with <venue>" when the venue is not the engine's. Cancel. Enter acts; Esc closes.
- States: "Loading shows…", "No shows. Import V1 with ptah import-v1."
- Toasts: "loading <name>"; "Load show failed" / "Restart failed"; "venue change failed; still on X".

### Board (show playing), one column
- **Status band**: label, word, right label ("Active faults" N, or "For" a duration). States: "Fault · universe(s) N not sending" / "…, not in the venue"; "Fault · engine back, not in sync"; "Fault · <device or subject>" / "Fault · go and fix"; "Status connecting"; "Warning · outputs holding / engine restarting"; "Warning · no data from the engine / stale"; "Status waiting"; "Warning No show loaded"; "Warning waiting for Reaper"; "Warning · no clock from <master>"; "Status All well".
- **Words**: Clock (locked / free-run / stale / —), Outputs "n / N" or "holding", BPM ("BPM", "BPM held", "BPM internal").
- **Song**: "Song 04 / 11", name, big bar number, 4 beat ticks. During a restart the ticks become three steps: "Link lost" → "Reconnecting" / "Link back" → "Clock locked" / "Clock internal" / "Clock stopped".
- **Active programs**: 3 rows with trigger chip (C3, CC 2, PC 4, OSC), name, group badge; count or "+ N more". Dimmed while holding.
- **MIDI**: devices "n / N", Last in "chip · 3 s", Unmapped count.
- **DMX**: one line per universe with live fixture tiles ("+N"), ending "sending" / "not sending" (red outline) / "holding".
- **Latency** (p99 over 10 s): Render, Output lag, End to end.
- **Emergency**: "Restart engine" (hold [R]; disabled with "Restart needs ptah supervise"; dimmed while the link is down); "Reload show" [L]; "Blackout" (hold [B], shows pressed); "Freeze" [F] toggle. Holds take 600 ms with a filling line; letting go early cancels. Pointer, Space/Enter or the key.
- **Transport** (Reaper): "Start" [P], "Stop" (hold [S]), "Go to start" [H]. Port closed: "no transport", tooltip "transport port not open (settings.transportPortName)".
- Other keys: C opens the checklist as a dialog over the board; M marks ("Marked 21:56:12", "PTAH could not mark: the recorder is not writing", "Mark failed").
- Failed commands: fault toast "<msg>" with "X failed".

### Palette "Perform commands" (⌘K)
Restart engine, Reload show, "Blackout (at once, no hold)", Freeze; Start Reaper, Stop Reaper, Go to start; Load show [L] / "Switch show"; Checklist [C]; "Mark this moment" [M]; "Phone link" (QR dialog or "local only"); "Full / column layout" (remembered); "Stage mode" [F2].

### Full layout (≥1024 px, or the override) adds a detail column
- Show name plus a "previewing" mark (a Builder draft is playing); Songs count; "⌘K Commands".
- "Faults · active first, cleared ones stay listed", "N errors · N warnings"; three rows: code subject ×count, "12 s ago" / "cleared 3 s ago".
- "Last inputs": ago, Input, Value, Device, "Mapped to" (or "unmapped").
- Device names, "checked every second".
- "Fixtures and dimmer" level meters.
- Latency sparklines.

### Narrow / phone
Column only, width min(440, window). Same board.

## 3. Lights, part 1 (today: Venue, `/venue`, `/venue/<id>`, `/venue/<id>/patch`)

### Header (Rig and Patch)
- Venue name, edited in place (empty ignored). "in use" mark when the engine runs this venue.
- "Venues ▾": open another venue, "New venue", "Duplicate venue" ("<name> copy"), "Delete venue" (danger; disabled while in use; confirms "Delete <name>?" with "It has no patches." or "These patches go with it: …").
- Fault count ("1 overlap, 2 errors"). Undo, Redo. Save (disabled when nothing changed, on errors, while saving; tooltip shows the first error).
- "saved, not applied: <reason>" (unknown reason: "the show still runs an earlier save").
- Save note: "Lit looks, parameter values and the song position start fresh." (clock stopped and the save would reload the playing show).
- Tabs Rig and Patch (Patch shows a count of patch warnings).

### Rig page
- **Universes table**: Name; No. (fault on repeat, "Universe number N is already X's"); Output (none / USB Pro / Art-Net / "sACN (not yet)"); Target (USB Pro: Serial, placeholder "any"; sACN: universe 1–63999; Art-Net: Host, "Port (blank is 6454)", Net 0–127, Subnet 0–15, universe 0–15); Rate Hz ("blank is the engine default"); Used "n / 512"; State (venue in use only: "connected", or "lost", "late"; sACN "not sent"); Remove (refused while it has fixtures, "<name> still has N fixtures"); "Add universe".
- **Channel map per universe**, headed "<name> · Universe N · <output>": 8×64 grid of named fixture blocks, overlaps highlighted; drag a block to re-address (ghost shows the landing); Left/Right move 1 channel, Shift+arrow by its own width; Enter/Space selects (shared with the table row); readout "name · type · 1–12".
- **Fixtures table** (sorted by universe then address; "No fixtures"): Name with fault icon (tooltip lists issues); Type picker (placeholder "Unknown type"); Mode (disabled when the type has none); Universe; Address 1–512 (red on fault); Ch (read-only); Groups (read-only, "group (show), …"); Flash; "⋯" Duplicate / Delete (a fixture used in a patch confirms "It is used in a patch; its slots become empty." and lists "show · group").
- **Add fixtures dialog**: "Adds Name 1 to Name n at consecutive addresses." Count, Type, Mode, Universe, Start address (follows the first free gap until typed), Base name. Hint "Uses A to B" or "They do not fit from here".
- **Type picker**: searchable; the user's types, then bundled entries marked "bundled" (max 50); "… more: keep typing", "No type matches"; footer "New type…" (opens `/library/new`) and "Open the Library". Picking a bundled entry imports it; a simplified entry gives the toast "<name> is simplified" with reasons.
- **Flash**: press and hold (pointer or Space/Enter), tooltip "Hold to flash"; off reasons "load a show on this venue", "save first", "Reaper is running"; released on blur, hidden tab, leaving. Toasts "Flash refused", "Flash failed".

### Patch page
- Bar: "Patch for <show ▾>" (several patches: "Gig · 2"; none: "No patch on this venue yet"); "Patch another show…"; Propose; "Save patch"; Revert.
- One row per group: name, "filled/wanted", a chip per slot ("empty" or fixture name; changed chips marked); chip menu lists fixtures that fit, then "<name> · does not fit", then "Empty"; tuple slots as text "A + B"; status "ok" or the issue, "· fallback: …", or "programs not read".
- "Not used by this show: …" or "none".
- Rig unsaved: page locked, "Save the rig to patch it".

### Shortcuts, palette, states
- ⌘S saves the rig, or the patch when on Patch with a clean rig (commits the field being typed first). ⌘Z / ⇧⌘Z except inside a field.
- "Venue commands": New venue, Duplicate venue, Add fixtures, Save, Propose patch, Go to Rig, Go to Patch.
- Loading blank; "No venue yet." with "New venue"; "This venue could not be read: …".
- Read faults: "<Fixture types | Bundled library | Shows | Venues | Programs of X> could not be read: … [Retry]".
- "Apply to the running show?" / "Save and apply" (only while the clock runs).
- Conflict: "This venue changed on disk / It was saved elsewhere since this page read it." Reload ("Reload and drop your changes?" / "Drop changes") or Overwrite.
- "Leave without saving?" Stay / Leave (app navigation, Back/Forward, closing the tab).
- While a patch saves the rig is read-only; toast "A patch is saving / Try again once it is saved".
- Toasts: Save refused, Save failed, Save patch failed, Propose failed, Import failed, New venue failed, Duplicate failed, Delete failed.
- Validation: "Fixtures X and Y share DMX channels", "…needs channels a..b, past 512", unknown type/mode/universe, patch health messages.
- `/venue` opens the venue in use, else the last opened, else the first.
- Under 900 px, read-only phone list: name and "in use", "Editing needs a wider screen", universes with output and state, fixtures as "U/001 · type" each with a large Flash, patch rows "n/m · ok/issue".

## 4. Lights, part 2 (today: Library, `/library?q=&f=`, `/library/<id>`, `/library/new`)

### List
- Search ("Search maker or model", ranked). Filter tabs with counts All / Mine / Bundled. Both kept in the URL. "New type".
- Table: Type, Maker, Modes ("4 · 6 · 8 ch"), Source (mine/bundled), Conversion ("clean" or "simplified" with reasons in a tooltip), "Used in" ("Venue (n)" or "—"; hidden under 1100 px).
- Own types: Edit, Duplicate, Delete (disabled when used, "Used in …"; confirms "Delete X? / The type is removed from your Library."). Bundled: Import, Duplicate. Actions disabled while one runs. Enter opens the type.
- "No type matches"; fault line ("type in use: Venue (n)"); footer "Bundled from Open Fixture Library, <date>, MIT licence" (link); read faults with Retry.
- Under 900 px: search, filters, tap rows (name, maker, modes); opens types only.

### Type page
- Header: "← Library"; Name and Maker edited in place; "mine"/"bundled" mark; "used in Venue (n fixtures), …"; fault count; Undo, Redo, Duplicate; Save (tooltip: first error) or Import for a bundled entry; fault line ("Save failed / Import failed / Duplicate failed / Reading the type again failed: …").
- Conversion line: "clean" or "simplified: <reasons>".
- Modes: tabs and "+ Add mode" ("Mode N"); mode name edited in place; "⋯" Duplicate mode / Remove mode (disabled on the last); mode fault line ("mode has no channels").
- Channel table ("No channels yet"): # drag handle ("Drag to reorder"; Alt+↑/↓); Name with fault icon; Role (27 roles: Intensity, Colour, Position, Beam, Shutter and strobe, Wheels and effects, Generic); "Fine of"; Default 0–255; Inverted; Value ranges summary (opens the dialog); "⋯" Move up, Move down, Duplicate, Delete; "+ Add channel".
- Ranges dialog ("Value ranges of X / From, to and what the range does."): rows From, To, Meaning with ×; "+ Add range"; inline "Row n reversed", "overlaps an earlier row"; Cancel, Done.
- Paste box ("Paste a channel list" + "Fill the table"): guesses roles and fine channels; a mode with channels asks "Replace this mode's N channels? / The pasted list takes their place; Undo brings them back."
- Lint: "fineOf … is itself a fine byte", "channel N already has a fine byte", range reversed/overlaps, "duplicate mode id".
- Bundled entry: read-only text table; Import makes it editable at the same URL.

### Save flow and states
- "Saving changes venues" ("Venues that use this type are affected."): per venue "fixture: 6 → 8 ch", "overlaps …", "passes channel 512"; "<show> · <group> loses a capability it needs"; "Could not read venue file …"; "The running show changes at its next reload."; Cancel / Save anyway.
- Blocked (Close only): "These fixtures must move first / They would pass channel 512. Move them in their venues, then save."; "A mode in use cannot be removed / Undo the removal, or change those fixtures' mode in their venues first."
- Conflict: "This type changed on disk / Someone saved it since you opened it." Reload or Overwrite.
- "Duplicate with your unsaved changes?"; "Leave without saving?"; "This type no longer exists."; read fault lines with Retry; edits refused while saving; a clean page re-reads on window focus.
- `/library/new` starts as "New type" with mode "Default"; the first Save changes the URL.
- ⌘S, ⌘Z, ⇧⌘Z.
- Under 900 px: "← Library", name, maker, each mode with "N ch" and its channel list as text.

## 5. Effects (today: Builder)

### Program list (`/builder`)
- "Programs", one section per show (the playing show first, marked "playing"); "New program" per show; "No programs yet".
- Each line: still picture of its curve; name (opens it); "used by N rows"; "6 nodes · speed, size"; Duplicate; "Copy to…" (other shows; disabled when none); Delete.
- Refusal slot per line: "used by …", "played inside …", "<show> already has a different program with that id"; plain server errors ("PTAH did not answer", "the connection was lost", "it is no longer there", "the show changed on disk", "PTAH refused it").
- Delete confirm: "Delete <name>?" / "The program's file is removed. A program a row plays cannot be deleted."
- New program: "new program" (or "new program N"), opens unsaved.
- Loading; "Programs could not be read: … [Retry]"; narrow under 900 px.

### Program editor (`/builder/<showId>/<programId>`)
- **Header**: "← Programs"; name edited in place ("a program needs a name", "another program has this name"); "on the rig" mark; show name; "used by N rows"; fault count (opens an issue list); Undo, Redo, Tidy, Save.
- **Line under the header**: canvas refusals ("no input takes this wire") or notices: "saved, not applied: … Open the patch"; "the show does not list this program: … [Retry]"; "On the rig could not be turned off[, so nothing was saved]: …".
- **Canvas**: pan (drag/scroll), zoom (pinch or ⌘-scroll, 0.25–2×), dot grid, "Fit". Node box: title (subgraph adds its program's name; setting node adds the setting's name), field values, ports, live curve along the bottom, colour swatch on a colour output, "—" without a value. Errors and warnings marked on nodes and wires. Wires by dragging output → input; valid inputs light up; a refused wire says why; dropping on empty canvas opens the add box filtered to nodes that take it.
- **Notes**: sticky text boxes; drag; Enter edits; arrows move; Delete removes.
- **Add box**: typing a letter on the canvas, or "Add node"; search with node name and family; "no node matches"; "preview unavailable: nodes cannot be added".
- **Keys**: Shift-click multi-select; arrows move (Shift further); Delete/Backspace; Enter selects; W on an output port starts a keyboard wire (arrows choose, Enter connects, Esc cancels); ⌘C, ⌘X, ⌘V (at the pointer), ⌘D; ⌘S; ⌘Z / ⇧⌘Z; Space holds the test note; Tab walks nodes in reading order.
- **Inspector**: a control per field for one node; subgraph, previous value and unknown are read-only; refusals ("between X and Y"); setting picker "none yet"; several nodes: "N nodes" with Duplicate and Delete.

### Node kinds
- **Inputs**: number (value), setting (setting), velocity, which light, random (seed), time, beat.
- **Shape**: envelope (attack, decay, sustain, release); envelope (V1); lfo (shape sine/triangle/saw/square, rate, rate unit beats/hz, phase); smooth (ms); steps (steps); distortion (time, value, drive, tone, level).
- **Math**: add, subtract, multiply, divide, remainder, power; sin, cos, tan, asin, acos, atan, exp, log, square root, absolute, round, round down, round up; clamp (min, max); map range (from low/high, to low/high); select.
- **Outputs**: dimmer, strobe, position, beam (slot); colour (slot, mode rgb/hsv); channel (slot, channel).
- **Other**: subgraph (program), previous value, unknown (read-only), note.

### Dock
- **Test**: Hold (press and hold), Loop, Beats, Tempo 20–300 bpm, Velocity 0–127; "Plays like" while held / press on, press off / once; On stop fade out / cut / keep. Settings: a slider each; "…" editor with Name, Min, Max, Default, Unit (none/level/beats/seconds/degrees/hz/ratio), "Delete <name>"; "Add a setting". Dimmed with "the show drives" while From the show is on.
- **Preview**: mode all together / one note per light / spread; Lights 1–8; swatches (colour × dimmer, strobe mark; still under reduced motion); readout "P T / Z F / I"; in one-note-per-light mode a swatch picks the light the test note plays; "preview unavailable" without the core.
- **On the rig**: toggle and Row picker. Off reasons: "load <show> first", "no row uses this program", "Reaper is running", "preview unavailable", "fix the errors first", "turn off From the show first". Ended: "another page took over", "the preview timed out", "another show was loaded", "PTAH restarted", "the tab was hidden", "the connection was lost". "previewing without: …" and a live DMX list (fixture, address, bytes). Picking a row sets "Plays like", preview mode and routing. Ends on Save, leaving, narrowing.
- **From the show**: toggle with off-line ("load <show> first", "no row uses this program", "turn off On the rig first", "On the rig is on, on another screen", "the probe ended", "PTAH did not answer"). While on: Preview shows "lights: on the rig"; status ("C3 held · light 2 of 4 · 3 notes sounding", "all lights", "not playing", "not playing on light N"); messages ("unsaved changes: save to see the show again", "the show plays an older version: reload the show", "the show plays another version: reload the show, or reload this page", "this row is switched off or faulted: it plays nothing", "another screen is probing <row>"); Row picker; light picker ("newest note" / "light N"; hidden for together rows); "sampled 20 times a second: a very short hit may not show". Node values come from the engine; colour nodes "—"; values dim on link loss or reload; Hold disabled.

### Dialogs and states
- Loading; "This program could not be read: … [← Programs]".
- "This save changes the show" (row lines: fader loses its setting, "plays nothing", "output on slot N is gone"; Save anyway / Cancel); "This save breaks other programs" (Cancel only).
- "Apply to the running show?"; conflict "This program changed on disk" (Reload / Overwrite); toasts "Save refused", "Save failed"; "Leave without saving?".
- Palette: New program, Add node, Tidy, Save, Hold/Release, "From the show"/"Back to the test note", "On the rig"/"Off the rig".
- Under 900 px: name, "Editing needs a wider screen", settings list, read-only graph (pan, zoom, Fit).

## 6. Show (`/show`, `/show/<id>`)

- **Header**: name edited in place ("a show needs a name", "another show has this name"); "playing" mark; "Shows ▾" (open another, New show, "Duplicate show" (disabled "· save first"), Delete show (disabled while playing)); "channel" 1–16; fault count ("not checked" when unreachable; issue list links to the venue's Patch page); Undo, Redo, Save. Notices: "saved, not applied: … Open the patch", "saved, but the patches in X could not be pruned", "Program X could not be read: … Retry", "Shows could not be read … Retry".
- **Groups column**: per group name, "× size", needs ("dimmer + colour + 2 channels" / "nothing yet"), "N parts", "N rows", issue icon; "+ Add group"; "Not on any group".
- **Group line**: name, size ("any" not editable), "needs …", "· N parts per light"; menu "Merge with…", "Delete group" ("These rows and their notes go with it: …" or "can't be deleted: It is …").
- **Grid** (rows × lights): headers Row, each light (name editable, "a light needs a name"), Faders. Row head: name, "scene", dim chips for triggers the grid can't draw (CC→setting, OSC, program change, pad, key, pitch bend, key pressure) and stray notes. Row menu: Details, "Duplicate onto…", Move up/down, Disable/Enable, Delete.
- **Cells**: one per light for one-note-per-light rows; one wide cell "all together" or "spread" otherwise. Chips "60", "60·ch 2", "60·any"; ranges styled differently; overflow "+N".
- **Adding a note**: click the cell, type a note (0–127 or C3) and channel (blank, 1–16, any); Enter adds, Esc closes, Backspace in an empty field removes the last chip. Delete removes a chip. Hold a chip (pointer or Space) to audition; refusals "load this show first", "save first", "Reaper is running", "this row is disabled"; latching rows "plays while held here; the row keeps its value on a real note".
- **Faders column**: "CC 3 → speed". "+ Add program" below the rows. Arrow keys move around the grid.
- **Readout**: "note 60 · C3 · ch 1 · also starts …" plus issues and refusals.
- **Note strip**: all 128 notes on the show's channel, marked free / used / used by this group; hover "· free" or "· starts …"; two rows of 64 under 900 px.
- **Row details panel**: Name; Program picker (scene name for a scene row); Plays (one note per light / one note for all / one note, spread); Notes hold (while held / press on, press off / once); When it stops (fade out / cut / keep); Faders per setting (range, Source none/CC, CC 0–127, Channel any/1–16; "This program has no settings." / "A scene has no faders."); Outputs per slot (Drives natural / channel 0–511 / not used; Part "every part" / "part k of n"; "custom" read-only); refusal line; close.
- **Dialogs**: "No show yet. [New show]"; New show ("An empty show on channel 1, with no groups."); "This show could not be read"; Add program (Search, "This show" first then other shows, Plays picker); Merge with… (checkboxes with reasons, Name, per venue "patch carries over" or "these groups are on different lights; X keeps its lights"); channel change ("Move the N notes and M faders on channel A to channel B?" Cancel / Only new ones / Move); Delete show (lists venue patches); Apply to the running show; Conflict; Leave without saving; toasts.
- **Palette**: New show, Duplicate show, Add group, Add program, Merge groups, Save, "Go to <group>". ⌘Z / ⇧⌘Z.
- Under 900 px, read-only: name, "Editing needs a wider screen", per group each row as text or "No rows".

## 7. Inspect (today: Debug) and Settings

### Inspect: Live (`/debug`)
- **Bar**: "Live" / "Look back" switch; chips "notes", "CC", "other", "only what nothing listens to"; "Paused at bar 12.3"; "<show> on <venue>" or "No show is playing"; Pause/Resume [Space].
- **Coming in**: device lines (off / "not plugged in" / silent / "message N s ago" / "after restart"); clock line; messages table (bar, from, ch, message, "→ rows that listen"); listener words (row names, "row: setting", "song: X", overrides, "nothing listens"); "— paused 14 s —" on resume.
- **Playing now**: rows with age ("2 b"), ended rows dim; "refreshed 4 times a second: a very short hit may not show"; "No show is playing"; "not available on a replay".
- **Overrides**: Master N %, Blackout, Freeze, House lights, on/off.
- **Problems**: "code subject" with age, or "none"; "engine restarting" / "no data from the engine".
- **Going out**: per universe name, output, state, "N frames/s"; 512-cell grid with hover readout; "No venue yet."; "Timing · last 10 s" (usual / worst): "Note in → frame out", "Frame out → on the wire", "Work per frame", "Dropped" (hover breakdown).
- **Why panel**: hint "click a light to see why it does what it does"; click or Enter selects (`?light=`), again or Esc clears; head "name · channels a–b"; rows level / colour / strobe / position / beam / "channel N" with writers, winner mark and reasons ("wins: only one / higher priority / highest level / started last", "house lights are on", "fallback look: no show drives the rig", "via fallback", "waiting: a live row has it", "held", "resetting to 0", "quiet fade", "nothing writes it", "and n more"); override lines ("blackout forces 0", "master N %: a → b %", "identify", "overrides none", loud "frozen: this is the last frame"); channel lines "ch N name byte source"; footers ("N more writes not listed", "N voices were cut to make room…"); states for no light, no usable type, no show; dims on link loss; toast "PTAH could not watch the light: …". Selection shared with other screens.
- Pause holds every column; no new selection while paused. URL `?show=…&unheard=1&light=<id>`.

### Inspect: Look back (`/debug/back`)
- Bar: switch, chips, ◀ ▶ previous/next mark or problem ([ ]), Play/Stop [Space], "Mark now" [M].
- Header: "21:42:07 · bar 49.3 · 14 min ago · <show> on <venue>"; legend "your marks", "problems", "PTAH was not running" (hatched).
- Session strip (oldest → now, activity bars, flags, hatched gaps, band for the zoomed minute; click, drag, arrows). Zoom strip (−30 s … +30 s, ticks per message). ←/→ a frame; ⇧←/→ a bar.
- Columns: "Came in · around this moment"; "Was playing", Overrides, "Problems then"; "Went out" ("frame of hh:mm:ss" / "not recorded").
- States: "nothing recorded here"; "The recorder is off (Settings)."; read toasts. URL `?at=<ms>` plus chips. Play stops at a gap.
- Three columns from 1080 px of the screen's own width, one below.

### Settings (`/settings`)
- **Band**: "N changes"; "N changes apply when PTAH restarts: labels"; Discard; "Save" / "Save and restart" (⌘S); "Saved. Applies when PTAH restarts." with "Restart now"; "Restarting…"; "Saved. Start PTAH again for it to apply."; "Settings changed elsewhere." (Reload / "Keep mine"); "PTAH did not come back. Look at its terminal."; validation error in red; toast "Restarted".
- **Restart question** (clock running): "Reaper is playing." / "The lights stop changing for a few seconds while PTAH restarts." Cancel, "Save only", "Restart now".
- **MIDI inputs**: Device (editable for "PTAH's own port"), Port, On, Clock radio, Now ("used by <show>" if refused), ⋯ Remove; "Add a device" (plugged-in ports, "A new PTAH port…", "No other MIDI input is plugged in."); "Reaper transport port" with status.
- **Reaper offset**: "Set Track playback offset to −53 ms"; measure line (measured / partly measured / estimated); "For <venue>, the venue PTAH is on."; "On the LIGHTS track: Routing → Track playback offset"; per-universe breakdown; "Not set in Reaper yet." / "Reaper is set to X." / "…The advice is now Y."; "I typed it into Reaper"; "Choose a venue on Perform first." / "This venue sends to no output."
- **On the network**: "Other devices can open PTAH", Port, "applies the next time you start PTAH", address and QR.
- **When PTAH starts**: "Open the browser"; "After a crash, resume if it was less than N s ago".
- **Engine**: "Frames per second" ("DMX's maximum is 44"), "Notes at once, per row", "Longest held note", "Realtime priority", "Recorder keeps the last" N min, "Call the stage quiet after"; "Back to defaults".
- **About**: "PTAH v · files in ~/…".
- Errors, read failures, leave guard, palette ("Settings commands": Save, Discard, Restart now, Add a device).
- Two columns, one when narrower; under 600 px a read-only phone view.

## 8. Filed for later review (not part of the redesign)

- A global status mark in the header on every screen (today each page shows its own faults).
- Navigation on a phone (today a phone has no tabs, only Perform and the command palette).
- Hand control of master level and house lights (today they are readouts only).
