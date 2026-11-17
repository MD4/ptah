# Settings Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every setting the owner needs for a gig is changed on a Settings page: MIDI devices with their live state, the Reaper transport port, the Reaper offset to type in, the network address, start-up and engine numbers; a change is saved, then applied by a restart the page offers.

**Architecture:** The page edits `settings.json` whole through `GET`/`PUT /settings`, which gain a revision (`ETag`/`If-Match`) that ignores the three keys the engine writes, one process-wide settings lock, and a refusal to remove a device a show uses. A second revision over the restart-applied keys tells the page what waits for a restart. Three small read routes feed the page (`/midi/ports`, `/offset-advice`, additions to `/server` and `/devices`). The screen's parts and pure draft model live in the design system (`packages/ds/src/settings`); `apps/web/src/settings` wires them.

**Tech Stack:** Rust 1.93 (no new crate), React 19 + the ds, Vitest, Storybook gates, Playwright 1.59.1, Biome, cargo-nextest 0.9.150.

**Spec:** `docs/superpowers/specs/2026-11-17-v2-settings-screen-design.md` (V1 repo, 7846931). Executors read it first; § numbers below refer to it.

## Global Constraints

- Repo `~/projects/ptah-v2`, branch `settings-screen` from `master` (203eb75 or later). V1 (`~/projects/ptah`) is never modified except this plan and its spec.
- Never start V1 services or pm2; never touch `~/.ptah` or `~/ptah-home`; tests use temp roots and free ports; the owner's Storybook servers on 6006–6008 stay up; no outward pushes.
- `AGENTS.md` (disk): no extra git worktree for this plan (every task works in the main checkout, on disjoint files, staging by explicit path); never `cargo clean` mid-plan unless `du -sh target` is above 30 GB; check `df -h /System/Volumes/Data | tail -1` before a full workspace build and stop below 30 GB free.
- No new dependency, npm or crate (`Cargo.lock` and `pnpm-lock.yaml` gain no package). No schema change to `settings.json`. Anything else: stop and ask the owner.
- Keys of later steps (`ai`, `houseLightsSceneId`, `library`, `osc`, `audio`, `debugRateHz`) and unknown keys are never shown and are carried through every save untouched.
- Biome only; tokens-only styling; no shadows but the focus ring; 44 px targets on a coarse pointer; nothing shifts at run time (the band and every status word have a fixed box); calm when well, loud only when wrong; every action reachable by keyboard. The screen scrolls inside the shell's page area (root `height: 100%; overflow-y: auto; scrollbar-gutter: stable; position: relative`), never the window.
- No technical word on the page: no key name, no "supervisor", no exit code.
- Exact copy (§4):
  - band: `<N> changes apply when PTAH restarts: <labels>`; `<N> changes`; `Discard`; `Save`; `Save and restart`; `Saved. Applies when PTAH restarts.`; `Restart now`; `Restarting…`; toast `Restarted`; `Saved. Start PTAH again for it to apply.`; `Settings changed elsewhere.` with `Reload` / `Keep mine`; `PTAH did not come back. Look at its terminal.`
  - restart question: `Reaper is playing. The lights stop changing for a few seconds while PTAH restarts.` with `Cancel` / `Save only` / `Restart now`.
  - sections: `MIDI inputs`, `Reaper offset`, `On the network`, `When PTAH starts`, `Engine · rarely changed`, `About`.
  - devices: columns `Device`, `Port`, `On`, `Clock`, `Now`; `PTAH's own port`; `message <n> s ago` / `message <n> min ago`; `silent`; `not plugged in`; `off`; `after restart`; `Remove`; `used by <show names>`; `Add a device`; `A new PTAH port…`; `No other MIDI input is plugged in.`; `Reaper transport port`; `open` / `could not open`; `no transport keys`.
  - offset: `Set Track playback offset to <n> ms` (a real minus sign `−`); `On the LIGHTS track: Routing → Track playback offset`; `Estimated.`; `Choose a venue on Perform first.`; `This venue sends to no output.`; `Not set in Reaper yet.`; `I typed it into Reaper`; `Reaper is set to <n> ms.`; `Reaper is set to <a> ms. The estimate is now <b> ms.`; `Save first.`; terms `Waiting for the next frame (<r> Hz)`, `Waiting for the next send (<r> Hz)`, `Enttec USB Pro, one full frame`, `Art-Net node, one frame`, `sACN node, one frame`, `Fixtures (LED)` / `Fixtures (halogen)` / `Fixtures (discharge)`.
  - network: `Other devices can open PTAH`; `Port`; `Address`; `Only this machine: http://127.0.0.1:<port>`; `applies the next time you start PTAH`.
  - start and engine: `Open the browser`; `After a crash, resume if it was less than <n> s ago`; `never resume`; `Frames per second` with `DMX's maximum is 44`; `Notes at once, per row`; `Longest held note` (`beats`); `Realtime priority`; `Recorder keeps the last` (`min`, `0: off`); `Call the stage quiet after` (`s`, `without a note; 0: never`); `Back to defaults`.
  - about: `PTAH <version>`; `files in <root>`.
- Exact values: `Now` refreshed once a second while the page is visible; restart wait 20 s; defaults frames per second 44, notes at once 16, longest held note 16, realtime priority on, recorder 10, quiet 120, resume 60, transport port `ptah transport`; ranges frames 1–200, notes at once 1–64, port 1024–65535; widths: two columns from 900 px, read-only under 600 px; offset constants: frame wait `500 / renderRateHz`, output wait `500 / rateHz`, `usbpro`/`artnet`/`sacn` 23 ms, LED 8 ms, halogen 60 ms, discharge 20 ms.
- Conventions (owner): failing test first with the RED output in the report; at most three agents at once; a UI task runs `node packages/ds/scripts/test-visual.mjs --only <its boards>` and Storybook for its own stories; **any task that touches a shared part (a component, a primitive, the shell, a token) runs the full visual gate**; full gates at the checkpoints (Task 4 for Rust: `cargo nextest run --workspace`; Task 7 for the ds; `pnpm allcheck` in Task 10).
- Conventional Commits with scopes (`feat(model)`, `feat(server)`, `feat(engine)`, `feat(io)`, `feat(ds)`, `feat(web)`, `test(web)`, `docs`).

## Review Focus

1. A show is loaded (the engine writes `currentShowId`) while the page holds a draft: the save must neither conflict nor put the old show id back. → Task 3 test `a_loader_write_between_read_and_put_is_kept_and_does_not_conflict`.
2. The owner saves, then PTAH is not under its parent (`ptah run` alone): the page must say so and not wait 20 s. → Task 9 row P7.
3. A device is renamed or its port changed, not removed: the device guard must not fire, and `Now` must say `after restart`, not a stale live word. → Task 3 test `changing_a_device_is_not_removing_it`; Task 5 `nowWord` cases.
4. The file on disk lacks optional keys (the usual case): fields show defaults, an untouched save writes none of them, and the band counts nothing. → Task 5 `changes` cases.
5. The restart drops the page's stream while a second tab is on Perform: that tab must recover as it does today (no new behaviour needed, but the restart must stay the plain `POST /restart {}`). → Task 10 e2e asserts the page comes back without a reload.

## Execution order

- **Rust track:** 1 → 2 → 3 → 4. **Design system track:** 5 → 6 → 7. One task per track at a time, reviews alongside, three agents at most; both tracks in the main checkout (disjoint files, explicit-path staging; Rust tests with `cargo nextest run -p <crate>` only until Task 4).
- Then 8 (needs 3, 7) → 9 (needs 4, 8) → 10.

## File structure

```
crates/ptah-model/src/store/settings.rs   settings lock, the two revisions, engine-owned keys, device use
crates/ptah-model/src/offset_advice.rs    pure offset estimate
crates/ptah-io/src/midi/ports.rs          input_port_names()
crates/ptah-engine/src/loader.rs          remember() takes the lock
crates/ptah/src/cmd/mod.rs                edit_settings() takes the lock
crates/ptah-server/src/http/settings.rs   GET/PUT /settings (moved out of files.rs)
crates/ptah-server/src/http/offset.rs     GET/PUT /offset-advice
crates/ptah-server/src/http/midi_ports.rs GET /midi/ports
crates/ptah-server/src/http/{server,status}.rs   /server and /devices additions
packages/ds/src/settings/model/           draft.ts changes.ts validate.ts now.ts
packages/ds/src/settings/                 DeviceTable OffsetAdvice NetworkPanel StartPanel EngineFields About
                                          SettingsBand RestartDialog SettingsScreen SettingsPhone + stories
apps/web/src/settings/                    useSettings.ts useRestart.ts useDevicesNow.ts words.ts SettingsPage.tsx
apps/web/e2e/settings.spec.ts
```

## State table: the page (Tasks 7–9; every row is a test in the task named)

| # | State or event | Band and result | Task |
| --- | --- | --- | --- |
| P1 | file read, nothing changed, nothing waiting | band empty | 7, 8 |
| P2 | draft differs, at least one change needs a restart | `<N> changes apply when PTAH restarts: <labels>`; `Discard`, `Save and restart` | 7, 8 |
| P3 | draft differs, no change needs a restart (`openBrowser`, `resumeWithinSeconds`, `uiPort`, `listen` only) | `<N> changes`; `Discard`, `Save` | 7, 8 |
| P4 | draft has an error | the first error; `Discard`; no save | 7, 8 |
| P5 | `Save and restart`, clock stopped | PUT, then restart, `Restarting…`, then band empty + toast `Restarted`; the file, `/server`, `/devices`, offset read again | 9 |
| P6 | `Save and restart`, clock running | the question; `Cancel` → nothing sent; `Save only` → PUT, band `Saved. Applies when PTAH restarts.` + `Restart now`; `Restart now` → as P5 | 9 |
| P7 | restart answers 409 `no-supervisor` | `Saved. Start PTAH again for it to apply.`, no button, no 20 s wait | 9 |
| P8 | restart sent, no stream back within 20 s | `PTAH did not come back. Look at its terminal.` | 9 |
| P9 | PUT answers 409 | `Settings changed elsewhere.`; `Reload` → file re-read, draft dropped; `Keep mine` → file re-read, each changed shown key of the draft re-applied on it, band back to P2/P3 (nothing sent) | 8 |
| P10 | PUT answers 422 `device-in-use` | the removed rows come back marked `used by <names>`; the rest of the draft kept; nothing saved | 8 |
| P11 | PUT answers another 422 | each issue on the field its path names, else in the band; draft kept | 8 |
| P12 | page mounted while the file's restart revision differs from `/server`'s | `Saved. Applies when PTAH restarts.` + `Restart now` (asks as P6 without `Save only` while the clock runs) | 9 |
| P13 | `uiPort` or `listen` saved and different from the bound address | that row says `applies the next time you start PTAH`; the band does not count it as waiting | 9 |
| P14 | leaving the page with a draft (tab, link, Back, reload) | asks, as the other editors do; staying keeps the draft | 9 |
| P15 | a request in flight (PUT or restart) | the band's buttons disabled; a second ⌘S does nothing | 8, 9 |
| P16 | remount after a save without restart | P12 (from the server, not from page memory) | 9 |
| P17 | under 600 px | read-only screen; no band buttons | 7, 9 |

---

### Task 1: Settings lock, revisions, device use (model, engine, cli)

**Files:**
- Create: `crates/ptah-model/src/store/settings.rs`
- Modify: `crates/ptah-model/src/store/mod.rs` (declare, re-export), `crates/ptah-engine/src/loader.rs` (`remember`), `crates/ptah/src/cmd/mod.rs` (`edit_settings`)
- Test: in `settings.rs` (`#[cfg(test)]`)

**Interfaces:**
- Produces (all `pub`, in `ptah_model::store`):
  - `const ENGINE_KEYS: [&str; 3] = ["currentShowId", "currentVenueId", "currentPatchIndex"];`
  - `const RESTART_KEYS: [&str; 8] = ["devices", "transportPortName", "renderRateHz", "polyphonyPerInstance", "heldVoiceCapBeats", "realtimePriority", "recorderMinutes", "quietAfterSeconds"];`
  - `fn settings_lock() -> std::sync::MutexGuard<'static, ()>` (one process-wide mutex; a poisoned lock is taken anyway)
  - `fn owner_revision(settings: &Value) -> String`: `revision()` of the canonical bytes (object keys sorted at every depth, compact) of the document without `ENGINE_KEYS`.
  - `fn restart_revision(settings: &Value) -> String`: the same over an object holding only the `RESTART_KEYS` present.
  - `fn keep_engine_keys(body: &mut Value, on_disk: &Value)`: for each of `ENGINE_KEYS`, the body takes the disk's value, or loses the key when the disk has none.
  - `fn device_ids_used(show: &Value) -> BTreeSet<String>`: every string value of a key named `device` at any depth, except `"any"` and `"default"`.

- [ ] **Step 1: Write the failing tests** (names are the assertions)
  - `owner_revision_ignores_the_engine_keys_and_key_order`: two documents differing only by `currentShowId` and by key order have equal `owner_revision`; changing `renderRateHz` changes it.
  - `restart_revision_moves_only_with_restart_keys`: changing `openBrowser`, `uiPort`, `listen`, `resumeWithinSeconds`, `currentShowId` leaves it; changing each of the 8 keys moves it; an absent key and its default are different (absent ≠ `44`).
  - `keep_engine_keys_takes_the_disk_values_and_drops_absent_ones`.
  - `device_ids_used_finds_triggers_and_sources_and_skips_any`: on `fixtures/` show files via `serde_json::from_slice`, plus a literal with `{"device":"abc"}` nested in arrays.
  - `settings_lock_serialises_two_threads` (two threads append to a shared `Vec` inside the lock with a sleep; the order is never interleaved).
- [ ] **Step 2:** `cargo nextest run -p ptah-model settings` → FAIL (unresolved names).
- [ ] **Step 3: Implement** the six items. Then take `settings_lock()` across the read and the write in `loader::remember` and in `cmd::edit_settings` (first statement of each; nothing else changes).
- [ ] **Step 4:** `cargo nextest run -p ptah-model -p ptah-engine -p ptah` → PASS.
- [ ] **Step 5: Commit** `feat(model): a settings lock, the owner and restart revisions, device use`.

### Task 2: The offset estimate (model)

**Files:**
- Create: `crates/ptah-model/src/offset_advice.rs`; modify `crates/ptah-model/src/lib.rs` (declare)
- Test: in the file

**Interfaces:**
- Produces:
  ```rust
  pub const DEFAULT_OUTPUT_RATE_HZ_FOR_ADVICE: f64 = /* the engine's default output rate, re-exported or copied with a test in ptah-engine asserting equality */;
  #[derive(Serialize)] #[serde(rename_all = "camelCase")]
  pub struct OffsetAdvice { pub venue_id: String, pub venue: String, pub level: &'static str /* "estimated" */,
      pub offset_ms: Option<i64>, pub stored_ms: Option<i64>, pub universes: Vec<UniverseAdvice> }
  pub struct UniverseAdvice { pub universe: u32 /* its number as the venue names it */, pub name: String,
      pub output: &'static str /* usbpro|artnet|sacn */, pub total_ms: i64, pub terms: Vec<Term> }
  pub struct Term { pub what: &'static str /* frame-wait|output-wait|output|fixtures */, pub ms: i64,
      pub kind: Option<&'static str> /* fixtures: led|halogen|discharge */, pub rate_hz: Option<f64> /* the two waits */ }
  pub fn offset_advice(venue: &Venue, types: &[FixtureType], render_rate_hz: f64, default_output_rate_hz: f64) -> OffsetAdvice
  ```
- Rules (§6.3): a universe with output `none` is left out; technology = the one most patched fixtures of the universe have by `bulb_type` text match, case-insensitive (`led` → led; `halogen`|`tungsten`|`incandescent` → halogen; `discharge`|`hmi`|`msr`|`arc` → discharge; else led), ties and no fixture → led; each term rounded to the ms, `total_ms` their sum; `offset_ms = -max(total_ms)`, `None` without a universe; `stored_ms` from `venue.daw_offset_ms` rounded.

- [ ] **Step 1: Failing tests:** `usbpro_led_at_44_hz_is_minus_53` (11 + 11 + 23 + 8); `a_universes_own_rate_changes_the_output_wait` (`rateHz` 25 → 20); `halogen_majority_wins_and_a_tie_is_led`; `no_output_universes_are_left_out_and_none_gives_null`; `the_slowest_universe_is_the_headline`; `render_rate_parameter_moves_the_frame_wait` (22 Hz → 23); `stored_ms_is_the_venues_daw_offset`.
- [ ] **Step 2:** `cargo nextest run -p ptah-model offset_advice` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** → PASS. **Step 5: Commit** `feat(model): the estimated Reaper offset of a venue`.

### Task 3: Settings routes, `/server` and `/devices` additions (server)

**Files:**
- Create: `crates/ptah-server/src/http/settings.rs` (move `get_settings`/`put_settings` out of `files.rs`)
- Modify: `http/mod.rs`, `http/app.rs` (routes unchanged in path), `http/files.rs`, `http/shows.rs` (the `DELETE`'s settings correction takes `settings_lock()` inside the venue write lock), `http/server.rs`, `http/status.rs`, `state.rs` and `lib.rs` (new `Shared` fields)
- Test: `crates/ptah-server/tests/settings.rs` (new), additions to `tests/http.rs`

**Interfaces:**
- Consumes Task 1.
- Produces:
  - `GET /settings` → body as today; headers `ETag: "<owner_revision>"` and `Ptah-Restart-Revision: <restart_revision>`.
  - `PUT /settings` with optional `If-Match` (parsed by the existing `if_match`): under `lock_writes` then `settings_lock()` (that order): read the file; 409 `{ "error": "settings changed on disk", "revision" }` when `If-Match` ≠ the file's `owner_revision`; `keep_engine_keys`; the device guard; then validate, lint and write as today. Answer `{ path, issues, revision, restartRevision }` (`revision` = owner revision of what was written).
  - Device guard: ids in the file's `devices` and not in the body's, intersected with `device_ids_used` of every show that loads → 422 `{ "issues": [{ "level": "error", "code": "device-in-use", "path": "/devices", "message": "used by <names joined by ', '>" }…one per device], "devices": [{ "id", "shows": [names] }] }`, nothing written.
  - `GET /server` gains `settingsRevision` (`restart_revision` of the file as read when `Shared` is built; null when unreadable) and `root` (absolute, the home directory prefix replaced by `~`).
  - `GET /devices` rows gain `lastMessageAgeMs` (engine time now − `lastMessageAt`, in ms, saturating at 0; null with it). Engine time now: the clock the registry's stamps come from (`crates/ptah-engine/src/time.rs`); `Shared` gets what it needs to read it.

- [ ] **Step 1: Failing tests** in `tests/settings.rs` (the harness of `tests/shows.rs`):
  - `get_gives_both_revisions`; `put_with_a_stale_if_match_is_409_and_writes_nothing`; `put_without_if_match_is_unchecked`; `bad_if_match_is_400`;
  - `a_put_keeps_the_engine_keys_whatever_the_body_says` (body with another `currentShowId` and without `currentVenueId` → file keeps both);
  - `a_loader_write_between_read_and_put_is_kept_and_does_not_conflict` (GET; call `loader::remember` with a new show id; PUT with the GET's `ETag` → 200, file has the new id);
  - `two_concurrent_puts_one_wins` (same `If-Match`, two threads → one 200, one 409);
  - `removing_a_device_a_show_uses_is_422_with_the_shows_names` (a temp root whose show names the device by id in a trigger; and a second case in a source); `removing_an_unused_device_saves`; `changing_a_device_is_not_removing_it` (rename, disable, port change → 200); `a_show_listening_to_any_never_blocks`;
  - `server_reports_the_restart_revision_it_started_with_and_root`; after a `PUT` changing `renderRateHz`, `Ptah-Restart-Revision` ≠ `/server.settingsRevision`; after a `PUT` changing only `openBrowser` they stay equal;
  - `devices_carry_the_age_of_the_last_message` (fake MIDI message, then `lastMessageAgeMs` is a number ≥ 0; null before).
- [ ] **Step 2:** `cargo nextest run -p ptah-server settings` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** `cargo nextest run -p ptah-server` → PASS.
- [ ] **Step 5:** Update `docs/api.md` (the `/settings`, `/server`, `/devices` rows; replace the "without a lock" paragraph). **Commit** `feat(server): settings saves with revisions, a lock and a device guard`.

### Task 4: `/midi/ports`, `/offset-advice`; Rust checkpoint (io, server)

**Files:**
- Create: `crates/ptah-io/src/midi/ports.rs`, `crates/ptah-server/src/http/midi_ports.rs`, `crates/ptah-server/src/http/offset.rs`
- Modify: `crates/ptah-io/src/midi/mod.rs`, `http/mod.rs`, `http/app.rs`, `state.rs`/`lib.rs` (a `fake_io: bool` on `Shared` if none exists), `docs/api.md`
- Test: `crates/ptah-server/tests/settings.rs`

**Interfaces:**
- Consumes Task 2, the venue write path of `files.rs` (`lock_writes`, `save_doc`).
- Produces:
  - `ptah_io::midi::input_port_names() -> Vec<String>` (the system's order; an enumeration error → empty with `tracing::warn!`).
  - `GET /midi/ports` → `[{ "name" }]`: `input_port_names()` minus every enabled device's `virtualPortName` and the transport port name of the file; `[]` under fake I/O.
  - `GET /offset-advice?renderRateHz=<n>` → `OffsetAdvice` for `Shared.venue_id`'s venue with the fixture types of the tree (404 `no-venue`; `renderRateHz` default the file's; 400 for a rate outside 1–200).
  - `PUT /offset-advice` `{ "ms": <integer ≤ 0> }` → under `lock_writes`: read the venue, set `dawOffsetMs`, save as a venue `PUT` does → `{ "storedMs" }`; 404 `no-venue`; 422 `invalid-body` otherwise.

- [ ] **Step 1: Failing tests:** `midi_ports_is_empty_under_fake_io`; `offset_advice_for_the_fixture_venue` (exact JSON of one universe against the fixtures' venue); `offset_advice_without_a_venue_is_404`; `offset_advice_takes_the_rate_parameter`; `storing_the_offset_writes_the_venue_and_clears_offset_stale` (then `GET /offset-advice` has `storedMs`, and the venue's health no longer lists `offset-stale`); `a_positive_offset_is_422`. In `ptah-io`: `input_port_names_does_not_panic` (returns a `Vec`).
- [ ] **Step 2:** → FAIL. **Step 3: Implement. Step 4:** `cargo nextest run -p ptah-io -p ptah-server` → PASS.
- [ ] **Step 5: Rust checkpoint:** `df -h /System/Volumes/Data | tail -1` (≥ 30 GB free), then `cargo nextest run --workspace` and `pnpm rust:allcheck` → PASS.
- [ ] **Step 6: Commit** `feat(server): the MIDI ports this machine sees, the Reaper offset advice`.

### Task 5: The settings model (ds, pure)

**Files:**
- Create: `packages/ds/src/settings/types.ts`, `packages/ds/src/settings/model/{draft,changes,validate,now,index}.ts`
- Test: `packages/ds/src/settings/model/__tests__/{draft,changes,validate,now}.test.ts`

**Interfaces:**
- Produces (exported from `model/index.ts`):
  ```ts
  type SettingsDoc = Record<string, unknown> & { devices: Device[]; renderRateHz: number; uiPort: number };
  type Device = { id: string; name: string; enabled: boolean; clockMaster: boolean; virtualPortName?: string };
  type FieldKey = "devices" | "transportPortName" | "listen" | "uiPort" | "openBrowser" | "resumeWithinSeconds"
    | "renderRateHz" | "polyphonyPerInstance" | "heldVoiceCapBeats" | "realtimePriority" | "recorderMinutes" | "quietAfterSeconds";
  const DEFAULTS: Record<Exclude<FieldKey, "devices" | "uiPort">, unknown>;   // the values of Global Constraints
  const LABELS: Record<FieldKey, string>;   // "MIDI inputs", "Reaper transport port", "other devices", "port", "open the browser", "resume after a crash", "frames per second", …
  type Applies = "none" | "restart" | "next-start";
  const APPLIES: Record<FieldKey, Applies>;   // §4.1 table
  value(doc, key): unknown                    // the doc's value, else the default
  setField(doc, key, v): SettingsDoc          // writes the key (transportPortName "" → null); never touches other keys
  backToDefaults(doc): SettingsDoc            // renderRateHz 44; the other five engine keys removed
  addHardware(doc, port: string, id: string) / addOwnPort(doc, taken: string[], id: string) / removeDevice(doc, id)
  setClockMaster(doc, id | null) / renameDevice(doc, id, name) / setPort(doc, id, port) / setEnabled(doc, id, on)
  changes(file, draft): { key: FieldKey; label: string; applies: Applies }[]   // shown keys whose value() differs, devices compared deeply
  reapply(newFile, oldFile, draft): SettingsDoc   // Keep mine: each changed key of draft-vs-oldFile set on newFile
  validate(draft): { key: FieldKey; deviceId?: string; message: string }[]
  nowWord(device, live: LiveDevice | undefined, applied: boolean): { word: string; tone: "ok" | "idle" | "attention" }
  type LiveDevice = { id: string; enabled: boolean; present: boolean | null; lastMessageAgeMs: number | null };
  ```
- `validate` messages (plain words): `A device needs a name.`, `A device needs a port.`, `Two devices use the port <name>.`, `Two devices cannot both be the clock.`, `<Label> must be between <min> and <max>.`, `The transport port cannot be an input's port.`

- [ ] **Step 1: Failing tests,** including: an untouched doc lacking optional keys has `changes` `[]`; `setField(doc, "recorderMinutes", 10)` on such a doc (the default written over an absent key) is not a change, since `changes` compares `value()`; `setField(doc, "recorderMinutes", 5)` is one change labelled by `LABELS`; unknown keys (`ai`, `osc`, `foo`) survive every function by identity; `addOwnPort` names `ptah`, then `ptah 2`; `setClockMaster(doc, sameId)` semantics are the caller's (pass `null` to clear) and leave exactly zero or one master; `reapply` keeps the new file's other keys; `nowWord`: `{present:true, age:2000}` → `message 2 s ago` ok; 90 000 → `message 1 min ago`; `present:true, age:null` → `silent` idle; `present:false` → `not plugged in` attention; disabled → `off`; `applied:false` or no live row → `after restart`.
- [ ] **Step 2:** `pnpm -F @ptah-app/ds test -- src/settings` → FAIL. **Step 3: Implement. Step 4:** → PASS.
- [ ] **Step 5: Commit** `feat(ds): the settings draft model`.

### Task 6: The sections (ds)

**Files:**
- Create: `packages/ds/src/settings/{DeviceTable,OffsetAdvice,NetworkPanel,StartPanel,EngineFields,About}.tsx`, `Settings.module.css`, `sample.ts`, `Sections.stories.tsx`
- Test: `packages/ds/src/settings/__tests__/sections.test.tsx`

**Interfaces:**
- Consumes Task 5; existing components (`Table`, `Toggle`, `NumberField`, `TextField`, `Menu`, `Button`), the QR encoder `packages/ds/src/perform/phone/qr.ts` (import it; if it must move to be shared, move it to `packages/ds/src/components/_shared/qr.ts` with its test, re-export from perform, and run the full visual gate).
- Produces (props; every section also takes `readOnly?: boolean`):
  ```ts
  DeviceTable: { devices: Device[]; live: LiveDevice[]; appliedIds: Set<string>; refused: Record<string, string[]> /* id → show names */;
    errors: Record<string, string>; ports: string[] | null /* null: loading */; transportPort: string | null;
    transport: { port: string | null; open: boolean } | null; transportError?: string;
    onEnabled(id, on): void; onClock(id: string | null): void; onRename(id, name): void; onPort(id, port): void;
    onRemove(id): void; onAddHardware(port): void; onAddOwnPort(): void; onOpenAdd(): void; onTransportPort(name): void }
  OffsetAdvice: { advice: Advice | "no-venue" | null; canStore: boolean; storing: boolean; onStore(): void }
  NetworkPanel: { listen: boolean; port: number; urls: string[]; bound: { listen: boolean; port: number } | null; error?: string; onListen(b) onPort(n) }
  StartPanel: { openBrowser: boolean; resumeWithinSeconds: number; onOpenBrowser(b) onResume(n) }
  EngineFields: { values: Record<engine FieldKey, number | boolean>; errors: Record<string, string>; onField(key, v) onDefaults() }
  About: { version: string; root: string }
  type Advice = { venue: string; offsetMs: number | null; storedMs: number | null; universes: {...as Task 2} }
  ```
- Behaviour pinned by tests: clicking the selected clock radio calls `onClock(null)`; a hardware device's name is text, an own-port device's name and port are fields; a refused row shows `used by A, B`; `Add a device` lists `ports` then `A new PTAH port…`, an empty list shows `No other MIDI input is plugged in.` above it; the transport field emptied shows `no transport keys`; `OffsetAdvice` renders each state of §4.3 (no venue, no output, one universe, several universes with the largest as headline and one named block each, not stored, stored equal, stored different in the attention colour, `canStore: false` → button disabled with `Save first.`); the minus sign is `−`; `NetworkPanel` with `bound` differing from the values shows `applies the next time you start PTAH` on that row, with `listen` off shows `Only this machine: …` and no QR; `StartPanel` 0 reads `never resume`.

- [ ] **Step 1: Failing tests** for the behaviours above. **Step 2:** → FAIL. **Step 3: Implement,** tokens only.
- [ ] **Step 4:** tests PASS; stories `Settings/Sections/*` for each state; `node packages/ds/scripts/test-visual.mjs --only settings-sections` (boards recorded at 1280×800), Storybook tests for these stories.
- [ ] **Step 5: Commit** `feat(ds): the Settings sections`.

### Task 7: The screen, the band, the dialog, the phone; ds checkpoint (ds)

**Files:**
- Create: `packages/ds/src/settings/{SettingsBand,RestartDialog,SettingsScreen,SettingsPhone,ScreenHost}.tsx`, `Screen.stories.tsx`, `index.ts`
- Modify: `packages/ds/package.json` (export `./settings`), `packages/ds/vite.config.ts`, `packages/ds/tsconfig.build.json` (as `./builder` was added), `docs/design-system.md`
- Test: `packages/ds/src/settings/__tests__/screen.test.tsx`

**Interfaces:**
- Produces (from `@ptah-app/ds/settings`): everything of Tasks 5–6 plus
  ```ts
  type BandState =
    | { kind: "calm" } | { kind: "draft"; changes: Change[]; error?: string; busy: boolean }
    | { kind: "waiting"; busy: boolean } | { kind: "restarting" } | { kind: "no-parent" }
    | { kind: "conflict" } | { kind: "lost" };
  SettingsBand: { state: BandState; onDiscard() onSave() onRestart() onReload() onKeepMine() }
  RestartDialog: { open: boolean; withSaveOnly: boolean; onCancel() onSaveOnly() onRestart() }
  SettingsScreen: { doc: SettingsDoc; band: BandState; restartQuestion: null | { withSaveOnly: boolean };
    + the section props of Task 6 grouped as { devices, offset, network, start, engine, about };
    + the band and dialog callbacks; onDoc(next: SettingsDoc): void }
  ```
  `SettingsScreen` picks `SettingsPhone` under 600 px (read-only: every value as text, `Now`, the offset, the address; no field, no button), one column under 900 px (left column's sections first), two from 900 px. The save button reads `Save and restart` when any change has `applies: "restart"`, else `Save`.
- The band is one fixed-height row in every state (P1–P4, waiting, restarting, no-parent, conflict, lost).

- [ ] **Step 1: Failing tests:** one per band state for its exact copy and buttons (rows P1–P4, P17 of the state table and the waiting/restarting/no-parent/conflict/lost states); busy disables the buttons; ⌘S calls `onSave` once and not while busy or with an error; the dialog's three buttons, and no `Save only` when `withSaveOnly` is false; the phone renders no `button`, `input` or `[role=switch]`.
- [ ] **Step 2:** → FAIL. **Step 3: Implement.**
- [ ] **Step 4:** stories `Settings/Screen/{Well, Draft, Error, Waiting, Restarting, Conflict, Refused removal, No venue, Restart question}` and `Settings/Phone`; a no-shift story test cycling every band state (`noShift` helper); boards `settings-screen-*` at 1280×800 and `settings-phone-390x844`.
- [ ] **Step 5: ds checkpoint:** `pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/ds test && pnpm -F @ptah-app/ds test:storybook && pnpm -F @ptah-app/ds test:visual` → PASS (full gate: the package's entry list changed).
- [ ] **Step 6: Commit** `feat(ds): the Settings screen`.

### Task 8: Reading, drafting and saving (web)

**Files:**
- Create: `apps/web/src/settings/{useSettings,words}.ts`, `apps/web/src/settings/__tests__/{useSettings,words}.test.ts`
- Modify: `apps/web/src/api/types.ts` (the new answers), `apps/web/src/api/client.ts` only if a header read needs a helper

**Interfaces:**
- Consumes Tasks 3, 5, 7.
- Produces:
  ```ts
  useSettings(): {
    status: "loading" | "ready" | "failed";
    file: SettingsDoc | null; draft: SettingsDoc | null; restartRevision: string | null;
    changes: Change[]; errors: ValidationIssue[]; serverIssues: { path: string; message: string }[];
    refused: Record<string, string[]>; conflict: boolean; saving: boolean;
    setDraft(next: SettingsDoc): void; discard(): void;
    save(): Promise<"saved" | "conflict" | "refused" | "failed">;   // PUT with If-Match; never called with errors
    reload(): Promise<void>; keepMine(): Promise<void>;              // P9
  }
  words(e: unknown): string   // "PTAH did not answer", "the connection was lost", "PTAH could not save the settings"; never raw HTTP text
  ```
- `save` on 200 takes `revision`/`restartRevision` from the answer and the sent draft as the new file. On 422 `device-in-use` it fills `refused` and puts the removed devices back in the draft at their old index. A failed request toasts `words(e)` and keeps the draft.

- [ ] **Step 1: Failing tests** (fetch mocked as the other pages' hook tests do): rows P1–P4, P9 (both buttons; `keepMine` sends nothing), P10, P11, P15 (a second `save()` while one is in flight resolves without a second request), an unknown key survives a save round trip byte for byte in the request body, the `If-Match` header carries the `ETag` read.
- [ ] **Step 2:** `pnpm -F @ptah-app/web test -- settings` → FAIL. **Step 3: Implement. Step 4:** → PASS.
- [ ] **Step 5: Commit** `feat(web): reading, drafting and saving the settings`.

### Task 9: The page: restart, live devices, offset, route (web)

**Files:**
- Create: `apps/web/src/settings/{SettingsPage.tsx,useRestart.ts,useDevicesNow.ts}`, `apps/web/src/settings/__tests__/page.test.tsx`
- Modify: `apps/web/src/routes.ts` (`shipped` gains `"settings"`, last), `apps/web/src/App.tsx` (the page instead of the "Not yet" view; the leave guard as the other editors register it), the palette's screen entries, `apps/web/src/__tests__/routes.test.tsx`, `docs/app.md`

**Interfaces:**
- Consumes Task 8, Task 4's routes, the live stream's clock state and connection state as `PerformPage`/`BuilderPage` read them, the existing `POST /restart` caller of Perform (reuse its client function).
- Produces:
  ```ts
  useRestart(opts: { onBack(): void }): { phase: "idle" | "restarting" | "no-parent" | "lost"; restart(): Promise<void> }
    // POST /restart {}; 409 no-supervisor → "no-parent" at once; else "restarting" until the stream has dropped and is back
    // (or, if it never dropped, until GET /server answers with a changed settingsRevision), then onBack(); 20 s → "lost"
  useDevicesNow(visible: boolean): LiveDevice[]   // GET /devices every 1000 ms while visible; stops when hidden or restarting
  ```
- The page: `waiting = file's restartRevision !== server.settingsRevision` (P12, P16); `appliedIds` = when `waiting` is false, the ids of the devices whose draft object deep-equals their file object; when `waiting` is true, the empty set; `ports` fetched when the add menu opens; the offset fetched on mount, after `onBack`, after a store, and 300 ms after the draft's `renderRateHz` last changed (passing it as `renderRateHz`); `canStore` = draft `renderRateHz` equals the file's; `bound` from `/server.listen`.

- [ ] **Step 1: Failing tests** for rows P5–P8, P12–P17 of the state table, plus: the restart question appears only while the clock runs; `Now` polling stops when `document.hidden`; `I typed it into Reaper` sends `PUT /offset-advice` with the headline number and the section then reads `Reaper is set to −53 ms.`; a failed store toasts `words(e)`; the Settings tab is last and `/settings` renders the page.
- [ ] **Step 2:** → FAIL. **Step 3: Implement. Step 4:** `pnpm -F @ptah-app/web test` → PASS; `pnpm -F @ptah-app/web build`.
- [ ] **Step 5: Commit** `feat(web): the Settings page`.

### Task 10: End to end, docs, full gate

**Files:**
- Create: `apps/web/e2e/settings.spec.ts`, `docs/ledgers/settings-owner-check.md`
- Modify: `apps/web/e2e/scroll.spec.ts` (Settings scrolls inside the page, never the window), `docs/app.md`, `docs/api.md`, `docs/file-layout.md`, `docs/design-system.md` (whatever still says "reserved" or "Not yet")

**Interfaces:** consumes everything; the e2e harness of `apps/web/e2e/engine.ts` (a temp root copied from `fixtures/`, `ptah supervise` with fake I/O, a free port).

- [ ] **Step 1: Write the e2e tests:**
  - `frames per second is changed, saved and applied by a restart`: set 30, `Save and restart`, the band reads `Restarting…` then is empty without a page reload, `GET /settings` has 30 and `/server.settingsRevision` equals the file's restart revision.
  - `a new PTAH port is listed after the restart`: `Add a device` → `A new PTAH port…`, save and restart, `GET /devices` has it and its row no longer says `after restart`.
  - `removing a device a show uses is refused with the show's name` (the temp root's show edited to name the device by id before the engine starts).
  - `a show loaded while a draft is open does not conflict` (load a show through the API, then save).
  - `the offset is stored when confirmed` (`I typed it into Reaper` → `Reaper is set to … ms.`; the venue file has `dawOffsetMs`).
  - `the phone width is read-only @phone`.
- [ ] **Step 2:** `pnpm -F @ptah-app/web test:e2e` → PASS (fix the app, not the test, on a failure).
- [ ] **Step 3: Docs:** the route table and the Settings section of `docs/app.md`; the owner check (`docs/ledgers/settings-owner-check.md`): on the rig, (1) plug a controller, add it, restart, see `message … ago`; (2) move the clock master and back; (3) compare the advised offset with the −50 ms tuned by eye and store it; (4) restart while Reaper plays and time the gap; (5) open the address from the phone by the QR code; (6) confirm that after this V1 is no longer needed and can be uninstalled.
- [ ] **Step 4: Full gate:** `df -h /System/Volumes/Data | tail -1`, then `pnpm allcheck` → exit 0; `du -sh target` (report it; above 30 GB follow `AGENTS.md`).
- [ ] **Step 5: Commit** `test(web): Settings end to end` and `docs: the Settings screen`.
