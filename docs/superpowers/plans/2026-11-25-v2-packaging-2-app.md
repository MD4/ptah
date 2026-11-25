# Packaging 2 of 2: the app — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A friend installs PTAH with one pasted line (or a disk image), opens it like any Mac app in its own window, and updates it from Settings; the `ptah` command is the same file inside that app.

**Architecture:** A small Tauri shell (`app/`, its own Cargo workspace) carries the `ptah` program beside it in `PTAH.app/Contents/MacOS/`. The shell starts `ptah --app` as a child, reads its lines, and points its window at `http://127.0.0.1:<port>`. Everything the app needs from `ptah` (ending with the app, the next free port, joining a running one, swapping the whole app on update) is built into `ptah` itself; the shell holds only the window. The engine's render process is not touched.

**Tech Stack:** Rust 1.93, Tauri 2 (`tauri`, `tauri-build`, `tauri-plugin-window-state`, `tauri-plugin-dialog`, the npm `@tauri-apps/cli`), POSIX shell, `hdiutil` and `codesign` (ad hoc), Playwright WebKit, TypeScript and React for the one Live notice.

**Spec:** `~/projects/ptah/docs/superpowers/specs/2026-11-23-v2-packaging-design.md` (approved 2026-11-23). Plan 1 (`2026-11-23-v2-packaging-1-command.md`) is merged at `67fa926`. Code: `~/projects/ptah-v2`, branch `packaging-app` from `master`.

## Global Constraints

- The engine's render process gains nothing: no window, packaging, network or update code in `ptah-engine`, `ptah-vm`, `ptah-clock`. The root workspace's `Cargo.lock` gains no `tauri` package (a test holds this).
- No cost for the owner: no paid account, no certificate. The app is signed ad hoc (`codesign -s -`), never with an Apple Developer identity, and is not notarised.
- No new dependency younger than 14 days; every dependency pinned exactly (`=x.y.z` in `app/Cargo.toml`, exact versions in `package.json`), and every crate a new dependency adds to a lock file is at a version at least 14 days old.
- Nothing updates, and no update is offered, while a show is loaded (`showInfo` is set; `GET /api/v1/show-info` answers 200).
- An update never leaves a machine without a working PTAH: on any failure the old app stays at its place.
- The app and the command never drift: `ptah` on the path is a link to `PTAH.app/Contents/MacOS/ptah`; an update replaces the whole app.
- The window shows PTAH's own pages only. The web app gets no Tauri API (no capability for the `http://127.0.0.1` origin). A link to anywhere else opens in the system browser.
- Never touch the owner's `~/.ptah`, `~/ptah-home`, `/Applications` or `~/Applications`. Every test uses a temporary root, a temporary applications folder (`PTAH_INSTALL_APPS_DIR`) and `PTAH_RELEASES_URL`.
- Never start V1 services or pm2; leave the untracked `docs/design/brief/` and `.ignore` alone; the Storybook servers on 6006–6008 stay up; no push, no tag, no release and no change to the repository's visibility or secrets: those are the owner's actions, listed at the end.
- Disk (AGENTS.md): `df -h /System/Volumes/Data | tail -1` before a heavy build; below 30 GB free, clean first and tell the owner. The shell builds into `target/app` (one `target/` to watch). No extra worktree.
- At most three agents at once. Biome only for TypeScript, tokens-only CSS, the ZENITHALL patterns; `cargo fmt` and `clippy -D warnings` for Rust.
- New words on screen and in the terminal are the ones this plan lists.

## Decisions this plan makes

- **Versions** (each at least 14 days old on 2026-11-25; the builder checks again): `tauri =2.12.5`, `tauri-build =2.7.4`, `tauri-plugin-window-state =2.5.0`, `tauri-plugin-dialog =2.8.4`, `@tauri-apps/cli 2.12.4`, `marked 18.2.0` (build-time only, for the guide).
- **The shell is its own workspace.** `app/` (crate `ptah-app`, version read from the root workspace's), listed under `exclude` in the root `Cargo.toml`, with `app/.cargo/config.toml` setting `build.target-dir = "../target/app"`. `cargo test --all` at the root never compiles Tauri.
- **Names inside the app.** macOS file names ignore case, so the shell's file is `ptah-app` and the command's is `ptah`, both in `PTAH.app/Contents/MacOS/`. The bundle's name is "PTAH", its identifier `app.ptah.PTAH`.
- **`ptah --app`** (hidden; bare `ptah` only) turns on what the shell needs, and nothing changes without it:
  - it never opens a browser;
  - it stops cleanly when its standard input closes (the shell holds that pipe);
  - when the port is held by something that is not PTAH, it takes the next free one (up to 20 higher) and prints `ptah: port 8420 is taken; using 8421`;
  - when a PTAH already answers on the port: same root folder (compared after `canonicalize`) prints `ptah: join http://127.0.0.1:8420` and exits 4; another folder prints `ptah: another folder <path>` and exits 5;
  - `GET /api/v1/server` gains `"door": "app"` (else `"command"`);
  - after an update it installed itself, it prints `ptah: app updated`.
- **The lines the shell reads** from `ptah`'s standard error are those four and the existing `ptah: open http://127.0.0.1:<port>`. They are an interface: a test in `crates/ptah` and a test in `app/` hold the same strings from one shared file (`app/lines.txt`, read by both with `include_str!`).
- **Updating the app.** `installed_by` gains `Installed::App` (the running `ptah` is under `<name>.app/Contents/MacOS/`). Then `ptah update` downloads `PTAH-<version>-<target>.app.tar.gz`, checks it as today, unpacks it beside the app as `.PTAH.incoming.app`, runs the new `Contents/MacOS/ptah --version`, asks about a show again, renames the app to `.PTAH.previous.app` and the new one into place (two renames in one folder; if the second fails the first is renamed back). `--back` swaps them. The hidden previous app is kept until the next update, as `ptah.previous` is (the spec keeps it only until the new one has started once; keeping it longer lets `--back` work the day after, and plan 1 already does so). The checkpoint checks on this Mac that the hidden copy shows in neither Launchpad nor Spotlight.
- **Who updates.** With `door` "app": Settings' Update swaps, `ptah` prints `ptah: app updated`, and the shell stops the engine and opens the app again (`open -n <app>`). `ptah update` typed in a terminal while a PTAH with `door` "app" serves this root is refused: `ptah: PTAH's window is open; use its Update, or quit PTAH first`, exit 3. With no app open it swaps and says `ptah: 2.1.0 installed; start ptah again`, as today.
- **A joined engine is not the app's.** When the shell joined a running PTAH, closing the window closes the window only, with no question; the lights go on.
- **A release's files** gain, per Mac target: `PTAH-<version>-<target>.app.tar.gz` (holding `PTAH.app`) and `PTAH-<version>-<target>.dmg` (the app and a link to `/Applications`). `SHA256SUMS` lists them. The four `ptah-<version>-<target>.tar.gz` stay (Linux, Homebrew).
- **Installing on a Mac.** `install.sh` on Darwin installs the app archive into `/Applications` if writable, else `~/Applications` (`PTAH_INSTALL_APPS_DIR` replaces both, for tests), links `ptah` (`/usr/local/bin` if writable, else `~/.local/bin`) to `PTAH.app/Contents/MacOS/ptah`, and opens the app unless `PTAH_INSTALL_NO_OPEN=1`. On Linux it installs the command as today.
- **Homebrew** stays the command only; the formula's caveat says how to get the app (the one line).
- **The guide** is `docs/guide.md`, turned into one HTML page at build time (`marked`) and bundled in the shell. Help opens it in a second window, never in the main one. Its "Open Anyway" pictures are taken by the owner during his disk-image test (his action); until then that part is words.
- **Testing the shell.** macOS has no WebDriver for its web view, so the shell's decisions live in `app/src/core.rs` (pure, unit-tested), and integration tests run the built shell against a real `ptah --fake-io` through two test hooks, read in debug builds only: `PTAH_APP_TRACE=<file>` (one JSON line per state change) and `PTAH_APP_ANSWER=quit|cancel` (answers the quit question without a dialog). `PTAH_APP_PTAH=<path>` and `PTAH_APP_PTAH_ARGS` point the shell at a `ptah` and add arguments, in debug builds only; a release build uses the `ptah` beside it.
- **New words.**
  - Waiting screen: "Starting…"; "Port 8420 is taken. PTAH uses 8421."; "PTAH is already running with another folder" with the folder and the button "Quit"; "PTAH did not start" with `ptah`'s last line and the button "Quit".
  - Quit question: "A show is loaded. Quit PTAH and stop the lights?" with "Quit" and "Cancel".
  - Menus: the system's standard items, and Help → "PTAH Guide".
  - Live's checklist: "PTAH 2.1.0 is available" with "Update" (About's words).
  - Terminal: the lines above. `install.sh`: `PTAH is in <folder>.` and `The ptah command is in <folder>.`

## The shell's states

| State | Event | Result |
|---|---|---|
| Starting | `ptah: open http://127.0.0.1:P` | The window shows that address; state Shown |
| Starting | `ptah: port P is taken; using Q` | The waiting screen says so; still Starting |
| Starting | exit 4 with `ptah: join <url>` | The window shows that address; state Joined |
| Starting | exit 5 with `ptah: another folder <path>` | The "another folder" screen with Quit; nothing joined |
| Starting | `ptah` exits otherwise, or 20 s with no line | "PTAH did not start" with its last line and Quit |
| Shown | close, ⌘Q or Quit in the menu; no show loaded | `ptah` is stopped (its input closed, then waited for up to 5 s, then killed); the app ends |
| Shown | the same; a show is loaded | The quit question. Quit: as above. Cancel: nothing changes |
| Shown | the same; `ptah` does not answer within 1 s | Treated as a show loaded: the question is asked |
| Shown | `ptah: app updated` | `ptah` is stopped, `open -n` on the app's own path, the app ends |
| Shown | `ptah` exits by itself | "PTAH did not start" with its last line and Quit |
| Shown | the shell is killed | `ptah` sees its input close and stops within 5 s; no `ptah`, no `caffeinate` remains |
| Joined | close, ⌘Q or Quit | The app ends; the engine it joined goes on |
| Any | a link to an address that is not this PTAH's | Opens in the system browser; the window stays |
| Any | Help → PTAH Guide | The guide's window opens, or comes to the front |

## Review Focus

1. **The shell dies without warning** (force-quit, crash, the Mac logging out): no engine and no keep-awake child is left behind for the next launch to join by mistake. (Tasks 1, 3)
2. **A second launch**: the same folder joins; another folder joins nothing; something that is not PTAH on the port moves PTAH to the next one and says so. (Tasks 1, 3)
3. **An update cut in the middle of swapping the app**: a working `PTAH.app` is always at its place, and `ptah` on the path still runs. (Task 2)
4. **Every way to quit asks** when a show is loaded: the red button, ⌘Q, the menu. An engine that does not answer counts as a show loaded. (Task 4)
5. **The window never leaves PTAH**: a link elsewhere, the guide, or a page that tries to navigate away never replaces the Live screen. (Task 4)

---

### Task 1: `ptah --app`

**Files:**
- Modify: `crates/ptah/src/cmd/up.rs`, `crates/ptah/src/cmd/supervise.rs` (the stop on a closed input), `crates/ptah/src/cmd/run.rs` (passing `door` to the server), `crates/ptah-server/src/http/server.rs` (`door`), `docs/api.md`, `docs/engine.md`
- Create: `app/lines.txt` (the five lines, one per row, with `<port>`, `<other>`, `<path>` placeholders)
- Test: `crates/ptah/tests/cli.rs` (extend), `crates/ptah-server/tests/http.rs` (extend)

**Interfaces:**
- Produces: `UpArgs.app: bool` (`--app`, hidden); exit codes `EXIT_JOIN = 4`, `EXIT_OTHER_FOLDER = 5` in `cmd/mod.rs`; `GET /api/v1/server` → `"door": "app" | "command"`; `pub const LINES: &str = include_str!("../../../app/lines.txt")` in `crates/ptah/src/lib.rs` with `pub fn line(name: &str, values: &[(&str, &str)]) -> String`.

- [ ] **Step 1: Write the failing tests** in `cli.rs`, each on a temporary root with `--fake-io`:

```rust
#[test] fn app_stops_when_its_input_closes() { /* spawn with a piped stdin, wait for "ptah: open", drop the pipe: exit 0 within 5 s and no child `ptah run` of it remains (Review Focus 1) */ }
#[test] fn app_never_opens_a_browser() {}
#[test] fn app_takes_the_next_port_when_something_else_holds_it() { /* a plain TcpListener on P: stderr has "ptah: port P is taken; using Q" then "ptah: open http://127.0.0.1:Q" */ }
#[test] fn app_joins_a_ptah_of_the_same_folder() { /* exit 4, "ptah: join http://127.0.0.1:P"; a root given through a symlink joins too */ }
#[test] fn app_refuses_a_ptah_of_another_folder() { /* exit 5, "ptah: another folder <the other root>" */ }
#[test] fn without_app_a_running_ptah_is_still_exit_2_with_todays_line() {}
#[test] fn without_app_a_closed_input_stops_nothing() { /* stdin from /dev/null: still serving after 2 s */ }
```

  In `http.rs`: `/server` holds `door` "command" by default and "app" when started so.
- [ ] **Step 2: Run** `cargo nextest run -p ptah -p ptah-server` — FAIL.
- [ ] **Step 3: Implement.** The input watcher is a thread reading standard input to its end, then setting the supervisor's existing stop flag. The port search binds `127.0.0.1:<port>` to test it, before the supervisor starts.
- [ ] **Step 4: Run** — PASS; fmt, clippy.
- [ ] **Step 5: Commit**: `git commit -m "feat: ptah --app ends with its window, finds a free port, and joins a running ptah" <paths>`

### Task 2: An update swaps the whole app

**Files:**
- Modify: `crates/ptah-server/src/http/update.rs` (`Installed::App`, the 202 answer's `restarting`), `crates/ptah/src/update/install.rs`, `crates/ptah/src/update/mod.rs`, `crates/ptah/src/cmd/update.rs`, `docs/api.md`
- Test: `crates/ptah/tests/update.rs` (extend), unit tests in `install.rs`

**Interfaces:**
- Consumes: `door` (Task 1).
- Produces: `Installed::App { app: PathBuf }`; `pub fn app_archive_name(version: Version) -> String` (`PTAH-<version>-<target>.app.tar.gz`); `pub fn install_app(app: &Path, archive: &[u8], go_on: &dyn Fn() -> bool) -> Result<(), InstallError>`; `pub fn previous_app(app: &Path) -> PathBuf` (`.PTAH.previous.app` beside it); `POST /api/v1/update` answers `{ "restarting": "app" }` when the door is the app.

| State | Event | Result |
|---|---|---|
| `ptah` runs inside `X.app/Contents/MacOS/`, latest is newer, no show | `ptah update` | The new app at `X.app`, the old one at `.PTAH.previous.app`, "2.1.0 installed; start ptah again", exit 0 |
| The same, through the link on the path | `ptah update` | The same: the link is followed |
| A PTAH with `door` "app" serves this root | `ptah update` | The "window is open" line, exit 3, nothing written |
| The door is the app, no show | `POST /api/v1/update` | 202 `{ "restarting": "app" }`, the swap, then the line `ptah: app updated` on standard error |
| A show loads during the download | either | Refused as today; no `.PTAH.incoming.app` remains |
| The archive holds no `PTAH.app/Contents/MacOS/ptah`, a path outside `PTAH.app/`, or a link pointing outside it | either | The "does not match" line, nothing changed, nothing left behind |
| The new `ptah` does not start | either | The "does not start" line, nothing changed |
| The second rename fails | either | The first is renamed back; `X.app` is the old app (Review Focus 3) |
| After an update | `ptah update --back` | The two apps swap; "back to 2.0.0" |
| `ptah` is a bare file (Linux, or plan 1's install) | `ptah update` | As today: one file swapped |

- [ ] **Step 1: Write the failing tests**: one per row, with a helper that builds a small `PTAH.app` tree around the built `ptah` in a temporary folder and a release folder holding its signed app archive. The rename failure is forced by a read-only parent after the first rename (a test seam in `install_app`, not a new public flag).
- [ ] **Step 2: Run** `cargo nextest run -p ptah update` — FAIL.
- [ ] **Step 3: Implement.** Unpack with the same caps and path checks as today's single file, keeping modes and the links inside the app. The running server remembers the version it installed, as today.
- [ ] **Step 4: Run** — PASS; fmt, clippy.
- [ ] **Step 5: Commit**: `git commit -m "feat: ptah update swaps the whole app, and leaves it to the window when one is open" <paths>`

### Task 3: The shell starts, shows, joins and never leaves an orphan

**Files:**
- Create: `app/Cargo.toml`, `app/.cargo/config.toml`, `app/build.rs`, `app/tauri.conf.json`, `app/capabilities/default.json` (the waiting screen's window only), `app/src/main.rs`, `app/src/core.rs`, `app/src/engine.rs` (the child and its lines), `app/src/trace.rs`, `app/ui/index.html` and `app/ui/waiting.css` (the waiting screen, on `@ptah-app/zenithall`'s built CSS), `app/scripts/build-ui.mjs` (copies zenithall's `dist` CSS and fonts into `app/ui/`), `app/package.json` (workspace member `@ptah-app/app`, scripts `build`, `test`), `app/icons/` (from the web app's logo)
- Modify: root `Cargo.toml` (`exclude = ["app"]`), `pnpm-workspace.yaml`, `.gitignore`
- Test: `app/src/core.rs` unit tests, `app/tests/shell.rs`, `crates/ptah/tests/lock.rs` (the root lock holds no `tauri`)

**Interfaces:**
- Consumes: `ptah --app` and `app/lines.txt` (Task 1).
- Produces:

```rust
pub enum State { Starting { note: Option<String> }, Shown { url: String }, Joined { url: String }, OtherFolder { path: String }, Failed { last: String } }
pub enum Event { Line(String), Exited(Option<i32>), TimedOut }
pub enum Do { Nothing, Show(String), Note(String), Refuse(String), Fail(String), Relaunch }
pub fn step(state: &State, event: &Event) -> (State, Do);   // the table above, rows "Starting" and the line rows of "Shown"
```

  `PTAH_APP_TRACE` lines: `{"state":"starting"}`, `{"state":"shown","url":"…"}`, `{"state":"joined","url":"…"}`, `{"state":"other-folder","path":"…"}`, `{"state":"failed","last":"…"}`, `{"state":"quit"}`.

- [ ] **Step 1: Write the failing tests.** `core.rs`: one test per row of the table that `step` covers, and one that every line of `app/lines.txt` is recognised. `tests/shell.rs` (macOS only), each with a temporary root, `PTAH_APP_PTAH` at `target/debug/ptah`, `PTAH_APP_PTAH_ARGS=--fake-io`, and `PTAH_APP_TRACE`:

```rust
#[test] fn it_starts_ptah_and_shows_its_address() { /* trace reaches "shown"; GET <url>/api/v1/server answers with door "app" */ }
#[test] fn killing_the_shell_leaves_no_ptah() { /* SIGKILL the shell: within 6 s no process whose root is this root remains (Review Focus 1) */ }
#[test] fn a_second_launch_on_the_same_folder_joins() { /* trace "joined" with the first one's url; one ptah serves */ }
#[test] fn a_second_launch_on_another_folder_joins_nothing() { /* trace "other-folder" (Review Focus 2) */ }
#[test] fn a_port_held_by_something_else_moves_ptah() { /* trace "shown" on the next port */ }
#[test] fn a_ptah_that_cannot_start_is_said() { /* PTAH_APP_PTAH=/usr/bin/false: trace "failed" */ }
```

- [ ] **Step 2: Run** `pnpm -F @ptah-app/app test` (it builds `ptah` and the shell in debug, then `cargo test` in `app/`) — FAIL.
- [ ] **Step 3: Implement.** One main window, created on the waiting screen; `Show` navigates it. The child's standard input is a pipe the shell never writes to and never closes. No capability names the `http://127.0.0.1` origin.
- [ ] **Step 4: Run** — PASS; `cargo fmt` and `clippy -D warnings` in `app/`; the root `pnpm rust:allcheck` still passes and compiles no Tauri crate.
- [ ] **Step 5: Add** `pnpm -F @ptah-app/app test` to `allcheck` (macOS only; skipped elsewhere with a line saying so).
- [ ] **Step 6: Commit**: `git commit -m "feat: the PTAH window: it starts ptah, shows it, joins a running one, and leaves none behind" <paths>`

### Task 4: Quitting, the menus, the window's memory, staying inside PTAH

**Files:**
- Modify: `app/src/main.rs`, `app/src/core.rs`, `app/Cargo.toml` (the two plugins), `app/tauri.conf.json`
- Create: `app/src/quit.rs`, `app/src/menu.rs`
- Test: `app/src/core.rs` unit tests, `app/tests/shell.rs` (extend)

**Interfaces:**
- Consumes: `State`, `step`, the trace (Task 3); `GET /api/v1/show-info`.
- Produces: `pub enum Loaded { Yes, No, NoAnswer }`; `pub fn on_quit(state: &State, loaded: Loaded) -> Quit` with `pub enum Quit { Now, Ask, WindowOnly }`; `pub fn stays_inside(url: &str, ptah: &str) -> bool`; trace lines `{"state":"asked"}`, `{"state":"cancelled"}`.

- [ ] **Step 1: Write the failing tests.** `core.rs`: `on_quit` for Shown × {Yes, No, NoAnswer} and Joined; `stays_inside` for this PTAH's address, another port on 127.0.0.1, `https://github.com/…`, `file:///…`, `javascript:…`. `shell.rs`:

```rust
#[test] fn quitting_with_no_show_stops_ptah() { /* SIGTERM to the shell stands for ⌘Q: trace "quit", no ptah remains */ }
#[test] fn quitting_with_a_show_asks_and_cancel_keeps_everything() { /* load the demo through the API; PTAH_APP_ANSWER=cancel: trace "asked", "cancelled"; ptah still serves, the show still loaded */ }
#[test] fn quitting_with_a_show_and_quit_stops_ptah() { /* PTAH_APP_ANSWER=quit */ }
#[test] fn closing_a_joined_window_leaves_the_engine() {}
#[test] fn an_update_line_relaunches() { /* a stand-in ptah script prints "ptah: open …" then "ptah: app updated": trace "quit" with "relaunch": true; `open` replaced by PTAH_APP_OPEN=<script> in debug builds */ }
```

- [ ] **Step 2: Run** `pnpm -F @ptah-app/app test` — FAIL.
- [ ] **Step 3: Implement.** The window's close request, the menu's Quit and ⌘Q all go through one function. Navigation that does not stay inside is cancelled and handed to the system browser. The window's size and place are kept by the window-state plugin. Menus: the standard application, Edit and Window menus, and Help → "PTAH Guide" (it opens Task 5's page; until then the item is absent).
- [ ] **Step 4: Run** — PASS; fmt, clippy.
- [ ] **Step 5: Commit**: `git commit -m "feat: the PTAH window asks before stopping a show, keeps its place, and stays inside PTAH" <paths>`

### Task 5: The guide

**Files:**
- Create: `docs/guide.md`, `app/scripts/build-guide.mjs`, `app/ui/guide.css`
- Modify: `app/package.json` (`marked`, the `build` script), `app/src/menu.rs` (the Help item and the guide's window), `README.md` (a link to the guide)
- Test: `app/scripts/build-guide.test.mjs`, `app/tests/shell.rs` (extend)

- [ ] **Step 1: Write the failing tests.** `build-guide.test.mjs`: the built page holds the four headings ("Install", "Play the demo", "Your first light", "Connect Reaper"), no `<script>`, no address outside the page except links, and uses only zenithall's tokens. `shell.rs`: with `PTAH_APP_TRACE`, the Help item's handler opens a second window labelled `guide` and the main window's address does not change (Review Focus 5).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Write the guide**, one page, for a band member who has never used a terminal, in the app's plain style: install (the one line; the disk image and "Open Anyway" in words); play the demo (open PTAH, Load show → Demo, hold a row in Show, the test note in Effects); your first light (plug the DMX box, Lights → add a universe and a fixture, hold Flash); connect Reaper (the LIGHTS track and its output, from the master plan's Reaper notes); and a short last part: phones ("On the network" in Settings), updating, where the files live. Every screen name and button is checked against the app.
- [ ] **Step 4: Run** — PASS. The owner reads `docs/guide.md` before the plan is called done.
- [ ] **Step 5: Commit**: `git commit -m "docs: the guide, and Help opens it" <paths>`

### Task 6: The update notice on Live's checklist

**Files (modify):** `packages/ds/src/live/perform/` (the checklist: a calm `NoticeLine` with its action), `apps/web/src/perform/PerformPage.tsx` (it uses `useUpdate`, moved from `apps/web/src/settings/` to `apps/web/src/status/`), their tests and stories.

**Interfaces:**
- Consumes: `useUpdate` (plan 1): `{ info, update, updating }`.
- Produces: the checklist shows "PTAH 2.1.0 is available" with "Update" when a newer version is known, `canUpdate` is true and no show is loaded; nothing otherwise.

| State | Event | Result |
|---|---|---|
| No show, a newer version, can update | — | The notice with Update, under the checklist; the checklist does not move when it comes or goes (its room is held) |
| A show is loaded | — | No notice |
| Cannot update (not the installer's) | — | No notice (About says why) |
| "Check for updates" off | — | No notice, no request |
| Update pressed | 202 | "Updating…" in the notice; then the page reloads, or the window comes back |
| Update pressed | an error | The fault toast, as in About |

- [ ] **Step 1: Write the failing tests**: one per row (ds with a mocked hook value; the page test with a mocked API).
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- perform && pnpm -F @ptah-app/web test -- perform` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests, the Live stories, `e2e/perform.spec.ts` and `scroll.spec.ts` — PASS. Regenerate the Live boards that move, and add one board with the notice. Owner looks at the board.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 7: The screens on WebKit

**Files:** Modify `apps/web/playwright.config.ts` (two more projects, `desktop-webkit` and `phone-webkit`, `browserName: "webkit"`), `apps/web/scripts/test-e2e.mjs` (it runs `playwright install webkit` when the browser is missing), and whatever in `apps/web/src`, `packages/ds/src` or `apps/web/e2e` differs on WebKit.

- [ ] **Step 1: Run** `pnpm -F @ptah-app/web test:e2e -- --project=desktop-webkit --project=phone-webkit` and list every failure with its cause: a real difference in the screens, or a test that leans on Chromium.
- [ ] **Step 2: Fix each.** A real difference is fixed in the screens, with the test that showed it. A test leaning on Chromium is rewritten to hold on both. A test that cannot run on WebKit (a Chromium-only tool) is tagged `@chromium` with one line saying why, and the config's WebKit projects skip that tag. Nothing is skipped without its reason.
- [ ] **Step 3: Run** the whole e2e suite on all four projects, twice — PASS both times.
- [ ] **Step 4: Commit**: `git commit -m "test: the screens' end-to-end tests also run on WebKit, the window's engine" <paths>`

### Task 8: The app in the release and the installer

**Files:**
- Create: `scripts/make-app.sh` (builds `ptah` and the shell for one target, assembles and signs `PTAH.app`, makes the archive and the disk image), `scripts/make-app.test.sh`
- Modify: `scripts/make-release.sh` (it calls `make-app.sh` on Darwin), `install.sh`, `scripts/install.test.sh`, `.github/workflows/release.yml`, `.github/workflows/ci.yml`, `packaging/homebrew/ptah.rb.in` (the caveat), `docs/releasing.md`, `README.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: the shell (Tasks 3–5), `app_archive_name` (Task 2).
- Produces: `scripts/make-app.sh <target> <out-dir>` → `PTAH-<version>-<target>.app.tar.gz`, `PTAH-<version>-<target>.dmg`; `install.sh` as in the decisions.

- [ ] **Step 1: Write the failing tests.** `make-app.test.sh` (macOS): the archive holds `PTAH.app` with `Contents/MacOS/ptah-app` and `Contents/MacOS/ptah`; `codesign --verify --deep --strict PTAH.app` passes and the signature is ad hoc; `Contents/MacOS/ptah --version` prints the workspace's version; `Info.plist` holds that version; the disk image mounts and holds `PTAH.app` and a link to `/Applications`. `install.test.sh` (macOS part, against a local release folder, with `PTAH_INSTALL_APPS_DIR` and `PTAH_INSTALL_NO_OPEN=1`): the app is in that folder; `ptah` in the fake `/usr/local/bin` is a link into it and `ptah --version` answers; no file of the install carries `com.apple.quarantine`; run twice it leaves one app; a wrong fingerprint installs nothing; it never calls `sudo`; an existing bare `ptah` file at the link's place is replaced by the link. The Linux part stays as it is.
- [ ] **Step 2: Run** the two scripts — FAIL.
- [ ] **Step 3: Implement.** In the workflow: the two Mac jobs run `make-app.sh`; the gathering job lists the new files in `SHA256SUMS`. Left from plan 1's final review and done here: every third-party action is pinned by its commit; the job that needs `PTAH_RELEASE_KEY` checks it is set before any build starts. `ci.yml`: the macOS job runs `make-app.test.sh`, the installer test and the shell's tests.
- [ ] **Step 4: Read why CI failed** on the last pushes that ran (`gh run list --workflow ci.yml`, `gh run view <id> --log-failed`), fix what is in the repository, and write down what is not (the account's spending limit is the owner's).
- [ ] **Step 5: Run** the tests; an `update` test in `crates/ptah/tests/update.rs` now also takes an app archive made by `make-app.sh` (not the hand-built tree) from 2.0.0 to 2.0.1 and back.
- [ ] **Step 6: Commit**: `git commit -m "feat: the release carries PTAH.app, and the one line installs it with the command" <paths>`

### Task 9: Checkpoint

- [ ] **Step 1:** `df -h /System/Volumes/Data | tail -1`; `du -sh target`; clean per AGENTS.md if needed.
- [ ] **Step 2:** `pnpm allcheck` three times in a row on one HEAD, each exit 0. A failure is fixed with its test, or, if it passes alone, reported with its output and given its own time budget; then the three runs start again.
- [ ] **Step 3: A rehearsal on this Mac, all local.** With a throwaway key and `PTAH_RELEASE_PUBLIC_KEY`, make a 2.0.0 and a 2.0.1 release with `make-release.sh`, serve them, and with `PTAH_RELEASES_URL`, a temporary `HOME`, a temporary root and `PTAH_INSTALL_APPS_DIR`: run `install.sh`; the app opens with no security refusal (`xattr -r` shows no quarantine; `spctl -a -vv` and what it says go in the report); the waiting screen, then Live with the demo one step away; Settings → About and Live's checklist show "PTAH 2.0.1 is available"; Update relaunches the window on 2.0.1 with no refusal; `ptah update --back` from a terminal with the window open is refused, and with it closed goes back; a second launch joins; a show loaded, then ⌘Q asks; force-quit leaves no `ptah` and no `caffeinate`. Screenshots (`screencapture -l <window id>`) of each step go in the workspace's `walk/`, and the controller opens them.
- [ ] **Step 4:** Update `README.md` and `docs/releasing.md`. In the master plan, mark Step 7's second half built, merge pending the owner's word.
- [ ] **Step 5: The owner's actions**, listed in the final message, none done by the builder: read `docs/guide.md`; look at the Live board with the notice; open the disk image from a real download on his Mac, follow "Open Anyway", and take the two pictures for the guide; try the one line on a Mac with the macOS before the current one, if he has one; plan 1's list (the history report, a licence, the repository public, the key and its secret, the first tag, the Homebrew tap). Commit: `git commit -m "docs: installing the app" <paths>`.
