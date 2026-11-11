# PTAH V2 — Step 3A: the app shell and the Perform page on the engine

- **Date:** 2026-11-11
- **Status:** Draft for the owner's approval (brainstorming output)
- **Master plan:** `docs/superpowers/specs/2026-10-25-v2-master-plan.md` §5 Step 3
- **Builds on:** Step 1 (`ptah-v2/docs/engine.md`, `docs/api.md`), Step 2
  (`docs/superpowers/specs/2026-11-09-v2-step2-design-system-design.md`,
  `ptah-v2/docs/design-system.md`, `ptah-v2/docs/ledgers/step2c-deferred-and-rulings.md`)
- **Repo:** `~/projects/ptah-v2` (V1 in `~/projects/ptah` is never refactored)

## 1. Intent

Step 3 is the app; this first plan ships the smallest usable slice of it:
**one command starts everything, a browser tab opens on a readiness
checklist, the owner confirms the show, and the Perform page from Step 2C
runs live on the engine**, on the laptop beside the kit and on the phone.

Gig night today (owner's words): "I launch ptah, start ptah show, then
Reaper so that Reaper automatically connects to the ptah MIDI virtual
output. I want to see that everything is started, connected and ready to
play." The lesser number of steps is better, and both the terminal and the
app are useful.

Gig night after 3A:

1. `ptah`. The engine starts under its supervisor, the API and the app are
   served, the terminal prints the URLs, the browser opens on the Perform
   page.
2. The page shows the **readiness checklist**: engine · show (the remembered
   one, named, not loaded) · MIDI port waiting for Reaper · DMX devices ·
   universes · MIDI devices. The QR code for the phone sits on it.
3. The owner presses `L` and confirms the show. The checklist gives way to
   the Perform board, whose band says `waiting for Reaper`.
4. Reaper is launched, finds the PTAH virtual port, sends clock. The band
   goes quiet: `All well`, clock `locked`, outputs `2 / 2`.
5. During the gig the page is the 2C design, wired: Restart engine (through
   the supervisor), Reload show, Blackout, Freeze, switch show (⌘K), stage
   mode, the phone as a second display.

Owner decisions carried from the conversation: checklist first, **confirm
before anything plays**; `waiting for Reaper` then `clock locked`; the
checklist "summarises all needed things' status and shows what's ready or
missing"; the QR code on the page and the URL in the terminal; the web UI
can start shows.

## 2. Goals, non-goals, anti-goals

**Goals**

- A single command on the Mac brings the owner to a page that says, in one
  glance, what is ready and what is missing, then to the live Perform
  board, with nothing else to type.
- The Perform page of 2C runs on the real engine with every control that
  2C left unwired now working, and holds up through a crash and restart.
- The app is served by the `ptah` binary itself: nothing to install, the
  same page on the phone over the network.
- A shell the later screens (Venue, Show, Builder, Settings) drop into
  without changing Perform.

**Non-goals (this plan)**

- The other screens. They appear in the shell as they land, each after
  its own brainstorm and design round.
- Song length, sections, live parameter values on Perform: the engine does
  not know them (2C input); a later Step 3 plan.
- Authentication, the hotspot, the Tauri wrapper, auto-update (Step 7).
- Retiring V1 (end of Step 3). The band keeps running gigs on V1 until the
  owner says otherwise.
- Linux visual baselines (still pending the `visual-baselines` workflow).

**Anti-goals** (a failure even if it works)

- Anything that plays lights before the owner confirmed the show on a
  cold start.
- A second visual language: the app uses `@ptah-app/ds` only, no local
  colours, sizes or shadows; the 2C rules (calm when well, loud only when
  wrong, nothing shifts) hold on every state of the page.
- A page that lies about readiness: a line says `ready` only from a fact
  the engine reported, never from "no fault yet".
- A start-up that needs the terminal for anything but typing `ptah`.

## 3. Constraints

- Everything of the Step 2 spec's global constraints: React 19, TypeScript
  strict, Vite, Biome only, Base UI through `@ptah-app/ds`, styling through
  tokens only, motion 80/120/200 ms, no shadows but the focus ring, touch
  targets ≥ 44 px, both modes (normal and stage) on every screen.
- New dependencies: at least 14 days old at the time they are added,
  pinned exactly, in both `package.json` and `Cargo.toml`.
- Tests never touch `~/.ptah` (temporary roots through `PTAH_HOME` or
  `--root`), never start V1 services or pm2, never need real hardware
  (`ptah run --fake-io`).
- Node ≥ 20.11, pnpm 9.15.4, Rust workspace as is, CI as `ci.yml`
  (`pnpm allcheck` locally is the merge gate while GitHub Actions is
  billing-blocked).
- The engine's contracts (`docs/engine.md`, `docs/api.md`) are extended,
  never forked: one shape per thing, documented where it is defined.

## 4. Decisions

### 4.1 The `ptah` command

- **`ptah` with no subcommand** is the gig command (today bare `ptah`
  prints the usage: `main.rs` changes so that no subcommand means this).
  It is `ptah supervise --wait --listen --ui-port <settings.uiPort>`
  (`supervise` adds `run` itself) plus opening the browser. Flags:
  `--root`, `--no-open`, `--local` (bind `127.0.0.1` only), `--ui-port`,
  and `--show`/`--venue`/`--patch`, which **write `currentShowId`,
  `currentVenueId`, `currentPatchIndex` into `settings.json` before the
  start and are not passed to the child**: the picker reads them back
  from `GET /settings` as the remembered show *(my call)*. Every
  existing subcommand stays.
- **`--wait`** (new flag of `ptah run`): the engine reads the tree, comes
  up at **level 0 with no show and no venue**, API up, no output workers
  yet, raises no degradation fault, and waits for a `loadShow`. That first
  `loadShow` fixes the venue: the output workers start from it at the
  venue's rate, then the show is swapped in as today. It is a new level-0
  path, not level 2 (level 2 skips the tree, forces 40 Hz and reports
  `degradation: 2`; the checklist's Engine line could never read ready).
- **Cold start never resumes.** `ptah supervise` passes `--wait` to its
  **first child only**; a child it restarts after a crash or after exit
  75 gets the usual arguments and resumes from the journal (level 0), so
  the lights keep playing through a restart. Quitting `ptah` and typing it
  again within the 60 s `resumeWithinSeconds` window therefore comes back
  on the checklist, not on the lights (the owner's rule: confirm before
  anything plays). The journal of a run that ended cleanly under `--wait`
  is left on disk; the first `loadShow` starts a fresh run. *(My call on
  the mechanism; the rule is the owner's.)*
- It prints, on stderr, one line per URL: `ptah: open http://127.0.0.1:8420`
  and `ptah: phone http://<lan-ip>:8420` (one line per non-loopback
  IPv4), then the supervisor's usual lines. Opening the browser uses the
  platform opener (`open`, `xdg-open`); a failure to open is one line,
  never an error.
- **Bind address.** Bare `ptah` listens on every interface because the
  phone must reach it (owner: QR code on the page). `--local` and
  `settings.listen: false` restrict it. The API has no authentication
  (Step 1 decision, Step 7 revisits with the hotspot): the terminal's
  first line says so once (`ptah: anyone on this network can control the
  lights; --local to restrict`). *(My call: the owner asked for the
  phone; the risk is stated, not hidden.)*
- `ptah tui` keeps working as is and gains the readiness lines of §4.4 as
  its header (same facts, same words). The TUI is not rebuilt (master
  plan 4.4).

### 4.2 The restart endpoint (2C input)

- `POST /api/v1/restart` with body `{}` or `{ "venueId": "<id>" }` →
  `202 { "ok": true }` when the engine runs under a supervisor: the engine
  shuts down cleanly (last journal, outputs **hold** their last frame
  because nothing sends black) and exits with code **75** (`restart
  requested`). The supervisor treats 75 as a requested restart: immediate
  (`--restart-delay-ms`), level 0, **not counted as a crash**. The child
  knows it is supervised through `--supervised` (set by `supervise`,
  hidden).
- Without `venueId` the restarted child **resumes from the journal**: same
  show, same venue, the bar continues. With `venueId` the engine first
  writes `currentVenueId` (and keeps `currentShowId`) to `settings.json`
  and **marks the journal not resumable**, so the restarted child comes
  up as a cold start would under `--wait`: on the checklist with the show
  preselected, one key from playing on the new venue. A venue change is a
  home-versus-gig event, never a mid-song one *(my call)*.
- Without a supervisor: `409 { "error": "no-supervisor" }`; the page's
  Restart button is disabled with that reason in its toast.
- The page's `Restart engine` hold calls it; the 2C band then plays its
  existing restart sequence (link down → `restarting` → back → `not in
  sync` until the resume window closes → well).

### 4.3 The app package

- **`apps/web`** in the V2 workspace (`pnpm-workspace.yaml` gains
  `apps/*`): Vite + React 19 + TypeScript strict, depends on
  `@ptah-app/ds` (workspace), Vitest + Testing Library for units,
  Playwright for the end-to-end run of §4.8. Biome from the root.
- **Routing.** Paths: `/` is Perform. `/venue`, `/show`, `/builder`,
  `/settings` are reserved and **not linked until they ship**; an unknown
  path renders the ds `EmptyState` with a link back to Perform. A router
  library is the builder's choice (none is fine for five paths); it adds
  no visual rule.
- **Shell.** One frame: a 40 px top strip with the product mark, the
  shipped screens as text tabs (`Tabs` from ds; only Perform in 3A), the
  stage-mode toggle and the ⌘K hint; the screen below. On the phone and
  in the 430 px column the strip collapses to the mark and ⌘K (Perform
  owns the space). Keyboard-first: every action has a key, the palette
  lists them all.
- **The engine serves it.** The built app (`apps/web/dist`) is **embedded
  in `ptah-server`** at compile time (`include_dir` or `rust-embed`,
  pinned) and served at `/`, hashed assets cached for a year, `index.html`
  never cached, every unknown path under `/` falling back to `index.html`
  (client routing). `--static-dir` keeps overriding it for development.
  When `apps/web/dist` is absent at compile time the server serves a
  one-line placeholder page saying `pnpm build` is needed (so `cargo test`
  never depends on the web build); `pnpm allcheck` and the CI build the
  web app before the Rust stage. `settings.staticDir` is **not** added:
  the flag is enough. *(My call.)*
- **Development loop.** `pnpm -F @ptah-app/web dev` runs Vite with
  `/api` proxied (HTTP and WebSocket) to a running `ptah run --fake-io
  --ui-port 8420` (or any engine). The 2C replay source stays available
  behind `?replay=1` for work without an engine.

### 4.4 The readiness checklist

The checklist is **a state of the Perform page**, not a route: it shows
whenever **no show is loaded** (cold start under `--wait`, a restart with
a venue, a level 2 restart) and is always one key away (`C`, and
in ⌘K) when a show plays. It is composed from the 2C vocabulary
(`StatusWord`, 40 px rows, `--track-label` labels) and sits where the
board sits, in the column, on the phone and full screen. Each line has
three parts: the thing, its state word, one short reason when not ready.

| Line | Ready | Waiting (amber) | Missing (red) | Source |
| --- | --- | --- | --- | --- |
| Engine | `up` · rt yes · level 0 | `starting`, `restarting` | link down > stale window | `state.engine`, link status |
| Show | `<name>` loaded (venue · patch) | `<remembered name> — L to load` | `no show` (none remembered: `L to choose`) | `state.showInfo`, `GET /settings`, `GET /shows` |
| MIDI port | `Reaper connected` (the clock-master device has delivered any message, clock included) | `waiting for Reaper` (virtual port created, nothing received yet) | `port not created` (`input.lost` on the clock master) | `GET /devices` (`lastMessageAt`), `faults` |
| Clock | `locked` · bpm | `stopped` / `waiting` | `free-run` (red, as 2C) | `clock` |
| DMX devices | each output: `USB Pro · present` / `Art-Net · <target>` | `opening` | `not found` (`output.lost`) | `metrics.counters.outputs[]`, `faults` |
| Universes | `sending 2 / 2` | — | `U2 not sending` | as 2C |
| MIDI devices | `n / n present` | — | `<name> absent` | `GET /devices` |
| Phone | the QR code and the URL | — | `local only` (bound to 127.0.0.1) | `GET /api/v1/server` |

- "Reaper connected" needs one new fact: **per device, the engine time of
  the last message received, clock and transport included**
  (`lastMessageAt`, ns, null until one arrives), added to `GET /devices`
  only (the page polls it every second already; the `state` topic's
  engine block is fixed at start and stays as it is). It is distinct from
  the engine's existing `last_input_at`, which counts performer input and
  ignores clock. CoreMIDI cannot tell who is connected to a virtual port;
  "something is sending to it" is the honest word. *(My call.)*
- **The server block.** `GET /api/v1/server` → `{ "version", "listen",
  "urls": ["http://192.168.1.12:8420", …], "supervised": true|false,
  "staticDir": "embedded" | "<path>" }`. The page builds the QR code from
  the first non-loopback URL; with none, the Phone line says `local
  only`.
- **The QR code** is rendered as inline SVG from a small pinned encoder,
  white modules on `--bg`, quiet zone 4 modules, 160 px in the column,
  also reachable from ⌘K as `Phone link` (a `Dialog` with the big code and
  the URL as text).
- Tones: amber is "wait", red is "go fix", as 2C. Before the first
  `loadShow` nothing is red for the mere absence of a show or of Reaper.
  The band above the checklist reads `Not ready — 2 waiting` or `Ready to
  load — press L`, never `All well` (nothing is playing yet).
- Nothing shifts: every line is a fixed-height row with fixed-width
  status words; the reason text truncates.

### 4.5 Loading, switching, reloading a show

- `L` (and ⌘K `Load show`) opens the **show picker**: a ds `Dialog` with
  a `Combobox` over `GET /shows` (name, id), the remembered show
  preselected, Enter loads. The venue is the remembered `currentVenueId`
  when that venue has a patch for the show, else the only venue that has
  one; when **several** venues have a patch for the show, a second
  `Combobox` appears for the venue (patch = the remembered index for that
  pair, else the venue's first patch of the show). On a cold start under
  `--wait` the engine has no venue yet and accepts whichever the picker
  sends. Once the engine has a venue (a show was loaded in this run, or
  the run resumed), a load on another venue is refused by the engine
  (`venue change needs a restart`): the picker shows the current venue as
  fixed and offers `Restart with <venue>` (the restart endpoint with
  `venueId`, §4.2, after which the page is back on the checklist with
  that show preselected) *(my call)*.
- The load sends `loadShow` and waits for the ack (30 s deadline): the
  band shows `loading <name>` (amber), then the board takes over on the
  first `state` with `showInfo` of the new epoch. A refusal is a toast
  with the engine's message and the picker stays.
- `Reload show` (hold) re-sends `loadShow` with the current ids; `Switch
  show` is the picker during the gig (2C's "never forms" holds: the
  picker is a command, two fields, no editing).
- The remembered show comes from `GET /settings` (`currentShowId`,
  `currentVenueId`, `currentPatchIndex`), which the engine updates on each
  load, as today.

### 4.6 The Perform page, wired

- The 2C `Perform` composition moves from `packages/ds/src/stories/perform/`
  to `packages/ds/src/perform/` and is exported as **`@ptah-app/ds/perform`**
  (`Perform`, `PerformProps`, `PerformCommand`, `Rig`, `RigUniverse`,
  `rigOf(show, venue, types)` with `types` required: the fixture JSON
  imports, the `TYPES` default and the `SYNTHETIC`/`LARGE` rigs stay in
  the stories, so no test fixture reaches the app bundle); the stories,
  visual boards, no-shift and perf gates stay in `packages/ds` unchanged.
  *(My call: the gates live there; the app imports the page.)*
- The app builds the `Rig` from the engine: `GET /show-info` (ids, epoch) →
  `GET /shows/{id}`, `GET /venues/{id}` (its patch at `patchIndex`),
  `GET /types/{id}` for each type the patch uses; rebuilt on each new
  `showEpoch`. Fixtures whose type fails to load are tiles without colour
  and a `warn` line, never a crash.
- `sendCommand` posts to `/api/v1/commands`; `Restart engine` posts to
  `/api/v1/restart`; `pollDevices` reads `/api/v1/devices` every second
  (as the 2C defaults).
- The app chooses the layout: `full` at ≥ 1024 px wide, else `column`
  with the column at `min(440, viewport)` and centred; the phone is the
  column at 390. The `staleMs` default (1000) and the silence watchdog of
  the WebSocket source stay.
- The ⌘K palette lists: Load show, Switch show, Reload show, Restart
  engine, Blackout, Freeze, Stage mode, Checklist, Phone link, Full /
  column layout. Blackout and Freeze from the palette bypass the hold (2C
  docs say so); the hold buttons stay the touch path.
- Overrides reflect the engine: the Blackout and Freeze buttons read
  `state.overrides` and show `on` with the accent, so the phone and the
  laptop agree.
- The 2C items left for Step 3 are taken here: the `fallbackLook` /
  `engine.degradation` types fixed before the page reads them; device
  names verified against `GET /devices`; `+N` slot and `STRIP_CHROME`
  left as they are unless the device check shows a problem.

### 4.7 Settings

`settings.json` gains two optional keys with schema and migration as the
file-layout rules require: `listen` (boolean, default true), `openBrowser`
(boolean, default true). Nothing else; `uiPort` already exists.

### 4.8 Proof

- **End to end, no hardware** (Playwright against a real binary):
  `ptah supervise --wait --fake-io --ui-port <free port the test picked>
  --root <temp tree with the synthetic fixtures>` (an explicit port: each
  restarted child binds it again; `0` would move the API on every
  restart); the test opens the app, sees the checklist (engine `up`, show
  `waiting — L to load`, MIDI `waiting for Reaper`), loads the synthetic
  show, lights a fixture with a `trigger` command (`--fake-note` fires at
  engine start, before any show is loaded, so it cannot serve here), sees
  the board go live (bar advancing on the internal clock, U1 tiles lit),
  toggles Blackout and sees
  the override round-trip, calls Restart and sees the band play
  `restarting` → `not in sync` → well within 15 s with the bar continuing
  from the journal, switches show, and asserts **no layout shift** across
  the whole run with the 2C `noShift` helper. Runs in `pnpm allcheck` and
  in CI on macOS and Ubuntu.
- **Units**: the checklist model (`deriveChecklist(inputs) → rows`) with
  every row's three states; the picker's venue rule; the `Rig` builder on
  the fixtures; the server block; the `--wait` and exit-75 paths in Rust
  (`ptah supervise` tests already drive children).
- **Storybook**: `Checklist` (cold, waiting, missing, ready), `ShowPicker`
  (one venue, several venues, refused), `Shell` (laptop, phone, stage),
  each Normal and Stage, each under the axe, no-shift and visual gates of
  2C.
- **Owner's exit criteria**, on the Mac with the USB Pro and Reaper:
  1. `ptah` → the tab opens on the checklist within 5 s, the terminal
     shows both URLs.
  2. `L`, Enter → the board with `waiting for Reaper`; Reaper launched →
     `locked` without touching the page.
  3. The phone scans the QR and shows the same board, hold buttons work.
  4. `Restart engine` from the page: the lights hold, the board is back
     and in sync within 10 s.
  5. `ptah tui` in a second terminal shows the same readiness lines.

### 4.9 Documentation

`ptah-v2/docs/app.md` (new): the command, the shell, routes, how a screen
is added, the dev loop, the e2e. `docs/api.md` gains `/restart`,
`/server`, `lastMessageAt`; `docs/engine.md` gains `--wait`, exit 75,
`--supervised`, the first-child rule of `supervise`; `docs/design-system.md` points to the `perform` entry.
The V1 master plan's Step 3 status line is updated at merge, as before.

## 5. Left to the builder

- The router (or none), the Vite proxy details, the QR encoder (own or a
  pinned package), `include_dir` vs `rust-embed`, how the LAN IPs are
  enumerated (a pinned crate or `getifaddrs`), the exact Rust shape of
  `--wait` on the resume path.
- The checklist's and the shell's exact composition in Storybook, within
  the 2C rules. The owner judges them in Storybook first; a Claude Design
  round is held only if the owner asks after seeing them *(my call: the
  checklist is seven rows in the Perform vocabulary, not a new screen)*.
- Test roots, fixture trees and how the e2e finds a free port.
- Order of the plan's tasks, as long as every task leaves `pnpm allcheck`
  green.

## 6. Exit

Merged to `master`, tagged `step3a-complete`, `pnpm allcheck` green on the
merged head (CI too once billing is fixed), the owner's five criteria of
§4.8 passed and recorded in `ptah-v2/docs/ledgers/step3a-owner-check.md`.
The next Step 3 plan (Venue) opens with its own brainstorm.
