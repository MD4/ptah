# Show Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A show is built and edited in PTAH V2: groups, a grid of programs × lights holding the notes, faders and outputs per row, merging the groups of an imported show, and holding a note chip to play it on the rig.

**Architecture:** The screen's parts and its pure draft model live in the design system (`packages/ds/src/show`); `apps/web/src/show` wires them to the server. Checking runs on the server: the page posts its draft to a check route after each edit and shows the Rust lint's answer, so there is one set of rules. Merge, duplicate and delete are server operations under the existing write lock; hold-to-play is a new engine command, `audition`, built beside `identify`.

**Tech Stack:** Rust 1.93 (serde, axum; no new crate), React 19 + the ds (Base UI, CSS modules), Vitest, Storybook gates, Playwright 1.59.1, Biome, cargo-nextest 0.9.150.

**Spec:** `docs/superpowers/specs/2026-11-17-v2-show-screen-design.md` (V1 repo). Executors read it first; § numbers below refer to it.

## Global Constraints

- Repo `~/projects/ptah-v2`, branch `show-screen` from `master` (a6222c3 or later). V1 (`~/projects/ptah`) is never modified except this plan and its spec.
- Never start V1 services or pm2; never touch `~/.ptah` or `~/ptah-home`; tests use temp roots and free ports; the owner's Storybook servers on 6006–6008 stay up; no outward pushes.
- No new outside dependency. If one becomes necessary: stop and ask the owner; published ≥ 14 days earlier, pinned exactly.
- Biome only; tokens-only styling; no shadows but the focus ring; 44 px targets on a coarse pointer; nothing shifts at run time; calm when well, loud only when wrong; every action reachable by keyboard. A screen scrolls inside the shell's page area (root `height: 100%; overflow-y: auto; scrollbar-gutter: stable; position: relative`), never the window.
- Stage by explicit path only; leave the untracked `docs/design/brief/` and `.ignore` alone.
- The interface says **group** and **light**, never "role" or "member".
- Exact copy (§4, §5): `playing`; `another show has this name`; `Move the <n> notes and <m> faders on channel <a> to channel <b>?` with `Move them` / `Only new ones` / `Cancel`; `all together`; `spread`; `scene`; row plays `one note per light` / `one note for all` / `one note, spread`; notes hold `while held` / `press on, press off` / `once`; when it stops `fade out` / `cut` / `keep`; fader source `none` / `CC <n>`; output targets `part <k> of <n>` / `every part` / `custom`; `Merge with…`; `+ Add group`; `+ Add program`; `not checked`; `Apply to the running show?` with `Save and apply` / `Cancel`; hold reasons `load this show first` / `save first` / `Reaper is running`; `plays while held here; the row keeps its value on a real note`; delete refusal `Reaper is running`; conflict `This show changed on disk` with `Reload` / `Overwrite`.
- Exact values: check debounce 150 ms; audition hold 2 s, repeated every 500 ms; editing width 900 px; notes 0–127 with `noteName(60) === "C3"`; a duplicate is named `<name> copy`, then `<name> copy 2`, …; names compare trimmed and case-insensitively.
- Anti-goals are tests, not hopes: the untouched-part round trip (§2) and "after any edit other than to that cell, every note starts what it started before" are asserted in Tasks 7–9 and 2.
- Conventions (owner): failing test first with the RED output in the report; a Rust task runs in its own worktree with `target/debug` cloned from the main checkout (`mkdir -p target && cp -c -R <main>/target/debug target/debug`, nothing else of `target/`); at most three agents at once; a UI task runs `node packages/ds/scripts/test-visual.mjs --only <its boards>` and Storybook for its own stories; **any task that touches a shared part (a component, a primitive, the shell, a token) runs the full visual gate** (`pnpm -F @ptah-app/ds test:visual`); the full gates run at the checkpoints (Task 6 for Rust with `cargo nextest run --workspace`, Task 13 for the ds, `pnpm allcheck` in Task 16).
- Conventional Commits with scopes (`feat(model)`, `feat(server)`, `feat(engine)`, `feat(ds)`, `feat(web)`, `test(web)`, `docs`).

## Execution order

- Task 1 first (both tracks read the lint).
- **Rust:** 2 → 3 → 4 → 5 → 6. **Design system:** 7 → 8 → 9 → 10 → 11 → 12 → 13. One task of each track at a time, their reviews alongside (three agents at most).
- Then 14 → 15 (web; 14 needs 3, 4 and 13; 15 needs 5, 6 and 14), then 16.

## File structure

```
crates/ptah-model/src/show_edit.rs        merge, shape, patch pruning, duplicate (pure)
crates/ptah-server/src/http/shows.rs      the show routes of §6 (moved out of files.rs)
crates/ptah-engine/src/frame_loop.rs      audition state beside identify
packages/ds/src/primitives/NoteStrip/     the 128-note strip
packages/ds/src/show/model/               draft.ts grid.ts rows.ts notes.ts shape.ts ids (reuse venue's newId)
packages/ds/src/show/                     ShowScreen.tsx ShowHeader GroupList GroupLine Grid NoteCell Readout
                                          RowDetails dialogs/ ShowPhone  + stories, sample.ts
apps/web/src/show/                        ShowPage.tsx useShow.ts check.ts saveShow.ts audition.ts derive.ts
apps/web/e2e/show.spec.ts
```

## State table (the grid and its guards)

Every row is a story or a unit case in the task named.

| # | State | What is drawn | Task |
| --- | --- | --- | --- |
| 1 | Cell, per-light row, no note | dashed empty cell | 11 |
| 2 | Cell with one note | one chip, the number | 11 |
| 3 | Cell with several notes | chips in a fixed-height cell; past what fits, `+<n>` | 11 |
| 4 | Chip on another channel / `any` | `3·ch 2` / `3·any` | 11 |
| 5 | Notes of a range | chips joined by a line across the cells | 11 |
| 6 | Cell the row may not touch | blank, closed, not focusable | 11 |
| 7 | Row `all` / `spread` | one wide cell, chips + `all together` / `spread` | 11 |
| 8 | Row with other triggers | one dim chip per trigger in the row head line | 11 |
| 9 | Scene row | `scene` in dim text; program not changeable | 11, 12 |
| 10 | Disabled row | dimmed, still editable | 11 |
| 11 | Cell open for typing | input in place, cell size unchanged | 10, 11 |
| 12 | Typed text not a note | input in fault colour, Enter does nothing | 10 |
| 13 | Chip focused or hovered | readout line filled; strip cell marked | 11 |
| 14 | Issue on a cell / row / group | fault or warning mark at that place | 11, 14 |
| 15 | Check pending / unreachable | previous marks stay / `not checked` | 14 |
| 16 | Hold allowed | chip pressed look while held | 11, 15 |
| 17 | Hold refused: not playing / unsaved / clock running | readout gives the reason, nothing sent | 15 |
| 18 | Group with no rows; show with no groups | the Add program row only; an empty state with `+ Add group` | 11 |
| 19 | Row open in details | row marked; panel filled; grid height unchanged | 12 |
| 20 | Phone width | read-only text view | 13 |

## Review Focus

1. **A mapping that points outside the grid:** `memberOffset` at or past the group's size, a group of size `any`, an instance whose group id is unknown, a mapping whose instance is gone. The grid never throws: such notes are listed in the row head line (or a `Not on any group` list under the groups) and are kept on save. Test in Task 8.
2. **Merging groups that scenes name, or that a venue patches only in part.** Scene entries follow the merged id; a venue that patches none of the merged groups counts as alike; one that patches some but not the kept one is not alike. Test in Task 2.
3. **Check answers out of order:** a slow answer for an older draft, an answer arriving after Save or after switching show. Only the answer for the current draft is shown. Test in Task 14.
4. **A hold that never gets its release:** the pointer leaves the chip, the window loses focus, the tab is hidden, a touch is cancelled, the page unmounts. Each sends `off` and stops the repeat. Test in Task 15.
5. **Copying a program whose id this show already has with different content.** Nothing is overwritten; the answer says the files differ and the page says so. Test in Task 5.

---

### Task 1: One note on two lights of a row is not a duplicate

**Files:**
- Modify: `crates/ptah-model/src/lint/show.rs` (the key at :313), `packages/model-tools/src/lint/show.ts` (:232), `packages/model-tools/src/scripts/write-model-oracles.ts` (:731, a second case), `packages/model-tools/src/__tests__/model-oracles.test.ts` (:49), `fixtures/oracles/model/lint-cases.json` and `lint-issues.json` (regenerated), `crates/ptah-model/tests/oracles.rs` (`("show", 16)` → 17), `docs/schemas.md` if it describes the code

**Interfaces:**
- Produces: `duplicate-trigger` keyed by (instance, trigger, `memberOffset ?? 0`). Same message. A new oracle case `show-same-note-two-lights` (a per-member instance, one `midi.note` mapped twice with `memberOffset` 0 and 1) yields no issue.

- [ ] **Step 1: Failing TS test** — the new case gives `[]`; the existing `show-duplicate-trigger` case still gives its one warning. Run `pnpm -F @ptah-app/model-tools test -- show`. Expected: FAIL on the new case.
- [ ] **Step 2: Implement in TS**, add the oracle case, regenerate with `pnpm -F @ptah-app/model-tools oracles:model`.
- [ ] **Step 3: Failing Rust test** — bump the count to 17; `cargo nextest run -p ptah-model lint_cases` fails.
- [ ] **Step 4: Implement in Rust**; also assert all four fixture shows lint as before (no new or lost issue).
- [ ] **Step 5: Gates** — `pnpm -F @ptah-app/model-tools test && pnpm -F @ptah-app/model-tools typecheck`; `cargo fmt --all --check && cargo clippy -p ptah-model --all-targets -- -D warnings && cargo nextest run -p ptah-model`; `pnpm check && pnpm format`.
- [ ] **Step 6: Commit** — `fix(model): a note on two lights of one row is not a duplicate trigger`.

---

### Task 2: Merge, shape and patch upkeep in the model

**Files:**
- Create: `crates/ptah-model/src/show_edit.rs`, `crates/ptah-model/tests/show_edit.rs`
- Modify: `crates/ptah-model/src/lib.rs` (export)

**Interfaces:**
- Produces:
  ```rust
  /// Parts per light of a group: the highest `tuple_index + 1` any route of an instance on it names, else 1.
  pub fn group_parts(show: &Show, group_id: &str) -> u32;
  #[derive(Debug, Clone, PartialEq, Eq)]
  pub enum MergeError { TooFew, UnknownGroup(String), SizeDiffers { group: String }, PartsDiffer { group: String } }
  /// Fold `group_ids[1..]` into `group_ids[0]`, which keeps its id and gets `name`.
  pub fn merge_groups(show: &Show, group_ids: &[String], name: &str) -> Result<Show, MergeError>;
  /// Per patch of `show_id` in `venue` (by index): were the groups patched onto the same fixtures in the same order?
  pub fn merged_alike(venue: &Venue, show_id: &str, group_ids: &[String]) -> Vec<(usize, bool)>;
  /// Drop assignments (and fallbacks) of groups the show no longer has. True when something was dropped.
  pub fn prune_patch(patch: &mut Patch, show: &Show) -> bool;
  /// A copy under `new_id` and `name`: same groups, instances and mappings (ids kept), programs listed alike.
  pub fn duplicate_show(show: &Show, new_id: &str, name: &str) -> Show;
  /// `<name> copy`, then `<name> copy 2`, … : the first not in `taken` (trimmed, case-insensitive).
  pub fn copy_name(name: &str, taken: &[String]) -> String;
  /// Is `name` taken by a show other than `own_id`? Trimmed, case-insensitive.
  pub fn name_taken(name: &str, own_id: &str, shows: &[(String, String)]) -> bool; // (id, name)
  ```
- Rules (§4.5): instances and scene entries of the folded groups point at the kept id; position `k` stays position `k`; the kept group takes `member_names` from the first group that has them; `requires` is the union in canonical order (`cap_key`); the folded groups are removed; everything else in the show is untouched and in its order. `SizeDiffers` when sizes differ or either is `any`. `merged_alike`: a patch that assigns none of the groups is alike; otherwise all assigned ones must equal the kept group's assignment, and the kept one must be assigned.

- [ ] **Step 1: Failing tests** in `tests/show_edit.rs`:

```rust
#[test] fn hilldale_collapsed_merges_to_three_groups()          // ×4 groups → one, ×3 → one, red stays: PartsDiffer when asked to join the ×4
#[test] fn a_merge_keeps_every_mapping_and_its_light()           // mappings equal before and after, field for field
#[test] fn a_merged_show_lints_clean_and_compiles_to_the_same_frames() // on its venue with the kept assignment: same rendered frames for the replay oracle's MIDI (reuse the engine test helper the oracles use; if it lives in ptah-engine, put this one test there)
#[test] fn scene_entries_follow_the_kept_group()                 // Review Focus 2
#[test] fn sizes_and_parts_must_match()                          // SizeDiffers, PartsDiffer, `any`
#[test] fn fewer_than_two_groups_or_an_unknown_one_is_refused()
#[test] fn alike_when_all_assigned_equal_or_none_assigned()      // Review Focus 2, the three cases
#[test] fn pruning_drops_only_groups_that_are_gone()             // other shows' patches untouched; returns false when nothing to drop
#[test] fn a_duplicate_keeps_group_and_mapping_ids()
#[test] fn copy_names_count_up()                                 // "HILLDALE copy", then "HILLDALE copy 2"; case-insensitive
#[test] fn a_name_is_taken_only_by_another_show()
```

- [ ] **Step 2: Run** — `cargo nextest run -p ptah-model --test show_edit`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Gates** — `cargo fmt --all --check && cargo clippy -p ptah-model --all-targets -- -D warnings && cargo nextest run -p ptah-model`.
- [ ] **Step 5: Commit** — `feat(model): merge a show's groups and keep its patches valid`.

---

### Task 3: Show saves check the revision, the name and the patches

**Files:**
- Create: `crates/ptah-server/src/http/shows.rs` (move `get_show`, `put_show`, `list_shows`, `get_program`, `put_program` here from `files.rs`)
- Modify: `crates/ptah-server/src/http/{mod.rs,files.rs}`, `crates/ptah-server/tests/http.rs` (or a new `tests/shows.rs` using `support`), `docs/api.md`

**Interfaces:**
- Consumes: `ptah_model::show_edit::{name_taken, prune_patch}`, `lint::required_capabilities`, the helpers `if_match`, `read_revised`, `check_revision`, `lock_writes`, `save_doc`, `ApiError::changed_on_disk`.
- Produces:
  - `GET /shows/{id}`: adds `ETag: "<revision>"`.
  - `PUT /shows/{id}`: under `lock_writes`; `If-Match` as the venue `PUT` (409 `{"error":"show changed on disk","revision"}`, 400 `bad-if-match`); recomputes every group's `requires` from the draft and the programs on disk before validating; when the save creates the show or changes its name and `name_taken`, 422 `{ "issues": [{ "severity":"error", "code":"show-name-taken", "path":"/name", "message":"another show has this name" }] }`; on success, in the same lock, rewrites every venue file where `prune_patch` dropped something; answers `{ path, issues, revision }`.
  - `GET /shows`: each item gains `groups` and `instances` (counts).
  - `GET /programs`: `[{ "showId", "show", "id", "name" }]`, shows in `GET /shows` order, programs in show order.

- [ ] **Step 1: Failing route tests** (temp tree from `synthetic_store()` plus the hilldale fixtures):

```rust
#[test] fn a_show_get_carries_its_revision_and_a_stale_put_is_409()
#[test] fn a_put_without_if_match_or_creating_a_show_is_unchecked()
#[test] fn a_put_recomputes_requires()                 // send requires: [] ; the stored file has the computed list
#[test] fn renaming_to_another_shows_name_is_422_show_name_taken()   // trimmed, case-insensitive
#[test] fn a_show_that_already_shares_its_name_still_saves()        // literal and collapsed are both HILLDALE: PUT collapsed unchanged → 200
#[test] fn creating_a_show_with_a_taken_name_is_422()
#[test] fn saving_without_a_group_removes_its_assignments_in_every_venue() // and leaves other shows' patches byte-identical
#[test] fn an_unchanged_save_rewrites_no_venue_file()   // venue revisions equal before and after
#[test] fn shows_list_counts_groups_and_instances()
#[test] fn programs_lists_every_show_s_programs()
```

- [ ] **Step 2: Run** — `cargo nextest run -p ptah-server shows`. Expected: FAIL.
- [ ] **Step 3: Implement.** Moving the handlers is a pure move first (tests still green), then the behaviour.
- [ ] **Step 4: Gates** — `cargo fmt --all --check && cargo clippy -p ptah-server --all-targets -- -D warnings && cargo nextest run -p ptah-server -p ptah-model`; `docs/api.md` rows updated.
- [ ] **Step 5: Commit** — `feat(server): show saves check the revision and the name, and keep patches valid`.

---

### Task 4: The check route

**Files:**
- Modify: `crates/ptah-server/src/http/{shows.rs,mod.rs}`, `crates/ptah-engine/src/loader.rs` (one new public function), tests as Task 3, `docs/api.md`

**Interfaces:**
- Consumes: `store::check`, `store::load_tree_partial`, `health`, `HealthInput`, `CompiledShow::new` (through the engine: the server has no `ptah-vm` dependency and gets none).
- Produces:
  ```rust
  // ptah-engine/src/loader.rs
  /// Would this show render on this venue and patch? The issues `CompiledShow::new` refuses with, empty when it builds.
  pub fn render_issues(show: &Show, programs: &Programs<'_>, venue: &Venue, patch: &Patch, types: &Types<'_>, settings: &Settings) -> Vec<Issue>;
  ```
  - `POST /shows/{id}/check`, body the draft show → 200 `{ "issues": [Issue…], "venues": [{ "venueId", "venue", "patchIndex", "issues": [Issue…] }] }`. `issues`: exactly what the `PUT` would answer or refuse with (name rule included), `requires` recomputed first, nothing written. `venues`: one entry per patch of this show in the venues that load, the playing venue first when the engine plays this show; its `issues` are `health` on (draft, venue, patch with `prune_patch` applied in memory) followed by `render_issues`, deduplicated by (code, path). A body that is not a show: 422 `invalid-body`. Works for an id not on disk.

- [ ] **Step 1: Failing tests:**

```rust
#[test] fn check_answers_what_put_would()               // for each fixture show and three broken drafts: check.issues == the PUT's issues (warnings on 200, errors on 422)
#[test] fn check_writes_nothing()                        // tree bytes equal before and after
#[test] fn check_works_for_a_show_not_on_disk()
#[test] fn check_reports_a_venue_whose_patch_no_longer_fits()  // grow a group by one: that venue's issues name the group; others empty
#[test] fn check_reports_a_show_that_would_not_render_there()
#[test] fn the_playing_venue_comes_first()
#[test] fn a_body_that_is_not_a_show_is_422()
```

- [ ] **Step 2: Run** — `cargo nextest run -p ptah-server check`. Expected: FAIL.
- [ ] **Step 3: Implement.** One tree load per request, in `blocking`.
- [ ] **Step 4: Gates** — as Task 3 plus `-p ptah-engine`.
- [ ] **Step 5: Commit** — `feat(server): POST /shows/{id}/check answers a draft's problems, venue by venue`.

---

### Task 5: Merge, duplicate, delete and program copy routes

**Files:**
- Modify: `crates/ptah-server/src/http/{shows.rs,mod.rs}`, tests as Task 3, `docs/api.md`

**Interfaces:**
- Consumes: Task 2's functions; `store::{show_dir, delete, write_atomic, save}`; `read_doc(&layout, &DocId::Settings)`; the engine's show info and clock flag the server already mirrors.
- Produces:
  - `POST /shows/{id}/merge-groups`, body `{ "show": <draft>, "groupIds": [kept, …], "name" }` → 200 `{ "show": <merged draft>, "venues": [{ "venueId", "venue", "patchIndex", "alike": bool }] }`; 422 `{ "error": "groups differ", "reason": "size" | "parts" | "too-few" | "unknown-group", "group"? }`. Nothing written.
  - `POST /shows/{id}/duplicate`, body `{ "name"?: string }` → 200 `{ "id", "name" }`: under the lock, a new UUID, `copy_name` when no name is given (a given name that is taken is 422 `show-name-taken`), the show directory copied with its program files, and in every venue each patch of the original appended again with the new `showId`. 404 unknown show.
  - `DELETE /shows/{id}` → 200 `{ "ok": true, "playingPatchIndex"?: n }`: under the lock, removes the show directory and its patches in every venue, corrects `settings.currentPatchIndex` when `currentVenueId`'s list shrank before it, and names the playing patch's new index when it changed. 404 unknown; 409 `{ "error": "show in use" }` for the playing show or `settings.currentShowId`; 409 `{ "error": "clock running" }` when the playing patch would be renumbered while the clock runs.
  - `POST /shows/{id}/programs/{pid}/copy-from`, body `{ "showId" }` → 200 `{ "copied": bool, "differs": bool }`: copies the source show's program file when this show has no program `pid`; when it has one, `copied: false` and `differs` says whether the two files' JSON differ (Review Focus 5). 404 unknown show or program. The show's own `programs` list is the page's to edit in its draft.

- [ ] **Step 1: Failing tests:**

```rust
#[test] fn merge_groups_answers_the_merged_draft_and_writes_nothing()
#[test] fn merge_groups_says_per_venue_whether_they_were_patched_alike()
#[test] fn merge_groups_refuses_a_shape_mismatch_with_its_reason()
#[test] fn duplicate_copies_show_programs_and_patches()        // the copy loads; each venue has one more patch, equal to the original's but for showId
#[test] fn duplicate_names_count_up_and_a_taken_name_is_422()
#[test] fn delete_removes_the_directory_and_its_patches()
#[test] fn delete_corrects_the_remembered_patch_index()
#[test] fn delete_is_409_for_the_playing_or_remembered_show()
#[test] fn delete_that_renumbers_the_playing_patch_is_409_while_the_clock_runs_and_answers_the_new_index_when_stopped()
#[test] fn copy_from_copies_a_missing_program()
#[test] fn copy_from_never_overwrites_and_says_when_files_differ()   // Review Focus 5
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Gates** as Task 3.
- [ ] **Step 5: Commit** — `feat(server): merge groups, duplicate and delete a show, copy a program between shows`.

---

### Task 6: The `audition` command (and the Rust checkpoint)

**Files:**
- Modify: `crates/ptah-engine/src/{command.rs,frame_loop.rs}`, `crates/ptah-vm/src/{voices.rs,show/mod.rs,show/frame.rs,show/scenes.rs}` as needed, `crates/ptah-engine/tests/suite/frame_loop.rs`, `crates/ptah-engine/tests/perf.rs`, `crates/ptah-server/tests/http.rs` (one wire test), `docs/engine.md`, `docs/api.md`

**Interfaces:**
- Produces:
  ```rust
  // command.rs — wire: {"type":"audition","instance":3,"member":1,"on":true,"epoch":7}; member and epoch may be absent
  Command::Audition { instance: u32, member: Option<u32>, on: bool, epoch: Option<u64> }
  // frame_loop.rs
  pub const AUDITION_HOLD_NS: Nanos = 2_000_000_000;
  ```
  - `on`: refused in this order: `"stale epoch"`, `"no show"`, `"unknown instance"`, `"member out of range"` (a per-member instance with `member` absent or ≥ the group's size; a member given to an `all` or `spread` instance is ignored), `"clock running"`. Otherwise it starts a voice for that instance and member at velocity 1 with no MIDI key, ends any audition already held, and holds until `AUDITION_HOLD_NS` after the frame that took it; a repeated `on` for the same instance and member renews the hold without restarting the voice.
  - `on: false` is always `"ok"` and ends the audition when it is that instance.
  - The loop ends it by itself when the hold runs out, on the first frame whose clock snapshot runs, and on a show swap or removal.
  - Ending is always a reset of that voice, whatever the instance's `trigger.mode` and `on_stop` are; starting always behaves as a gate (a `toggle` or `oneshot` instance plays while held).
  - The audition's voice never appears in `voices_snapshot()` (the journal) nor in the recorder's show state.
  - Program and scene instances alike.

- [ ] **Step 1: Failing tests** in `tests/suite/frame_loop.rs`, modelled on the `identify_…` tests (:1691+):

```rust
#[test] fn audition_is_refused_in_order()                       // the five strings, each with the earlier ones satisfied
#[test] fn an_auditioned_instance_renders_and_stops_on_off()    // its channels move, then return to the unlit frame
#[test] fn audition_expires_two_seconds_after_the_last_on()
#[test] fn a_repeated_on_renews_without_restarting()            // the voice's start time is the first on's
#[test] fn a_new_audition_ends_the_previous_one()
#[test] fn audition_ends_when_the_clock_starts_and_on_a_swap()
#[test] fn a_hold_or_toggle_or_oneshot_instance_still_stops_on_off()   // nothing left lit one frame after off
#[test] fn an_auditioned_voice_is_not_journalled()              // voices_snapshot() empty while it plays; a resume brings nothing back
#[test] fn audition_plays_a_scene_instance()
```
  and in `tests/perf.rs`: `audition_taken_held_expired_and_refused_allocates_nothing`.

- [ ] **Step 2: Run** — `cargo nextest run -p ptah-engine audition`. Expected: FAIL (no such command).
- [ ] **Step 3: Implement.** State beside `identify` in the loop: `audition: Option<(u32 /*instance*/, Option<u32> /*member*/, Nanos /*until*/)>`. How the VM marks the voice (a reserved key, a flag) is yours, within the no-allocation rule; `docs/engine.md` gains its row in the command table.
- [ ] **Step 4: Wire test** in the server: the JSON above parses and is acked; `audition` is not in the engine-internal blocklist.
- [ ] **Step 5: Rust checkpoint** — `cargo fmt --all --check && cargo clippy --all-targets -- -D warnings && cargo nextest run --workspace`. All green, budget tests included.
- [ ] **Step 6: Commit** — `feat(engine): audition plays one instance on one light while held`.

---

### Task 7: The show draft — show and groups

**Files:**
- Create: `packages/ds/src/show/model/{index.ts,draft.ts,shape.ts}`, `packages/ds/src/show/model/__tests__/{draft.test.ts,roundtrip.test.ts,fixtures.ts}`, `packages/ds/src/show/{index.ts,types.ts}`
- Modify: `packages/ds/package.json` (`"./show"` export), `packages/ds/vite.config.ts` (`show: resolve(src, "show/index.ts")`)

**Interfaces:**
- Consumes: `Show`, `Group`, `Instance`, `Mapping`, `Program`, `Capability` from `@ptah-app/model-tools/types`; `newId` from `../venue/model/ids`.
- Produces (all pure):
  ```ts
  export const SHOW_EDIT_WIDTH = 900;                       // types.ts
  export type Programs = ReadonlyMap<string, Program>;
  export type ShowDraft = { base: Show; current: Show; past: Show[]; future: Show[] };
  export type ShowEdit =
    | { kind: "renameShow"; name: string }
    | { kind: "setChannel"; channel: number; move: boolean }   // move: rewrite notes and CC faders that were on the old channel
    | { kind: "addGroup"; id: string; name: string; size: number }
    | { kind: "renameGroup"; groupId: string; name: string }
    | { kind: "resizeGroup"; groupId: string; size: number }
    | { kind: "setLightName"; groupId: string; light: number; name: string }
    | { kind: "removeGroup"; groupId: string }                // its instances and their mappings go too
    | { kind: "replaceShow"; show: Show };                    // a merge's answer: one undo step
  export function openDraft(show: Show): ShowDraft;
  export function applyEdit(draft: ShowDraft, edit: ShowEdit, programs: Programs): ShowDraft; // the same object when nothing changes or the edit is refused
  export function refusal(draft: ShowDraft, edit: ShowEdit, programs: Programs): string | null; // why applyEdit would refuse
  export function undo(d: ShowDraft): ShowDraft; export function redo(d: ShowDraft): ShowDraft;
  export function isDirty(d: ShowDraft): boolean; export function markSaved(d: ShowDraft, saved?: Show): ShowDraft;
  export function channelMoveCount(show: Show, from: number): { notes: number; faders: number };
  export function newShow(id: string, name: string): Show;   // channel 1, every list empty
  // shape.ts
  export function partsOf(show: Show, groupId: string): number;          // as Rust group_parts
  export function mergeCandidates(show: Show, groupId: string): { groupId: string; ok: boolean; reason: string }[]; // reason e.g. "3 lights, this one has 4", "1 part per light, this one has 3"
  export function needsText(requires: Capability[]): string;             // "dimmer + colour", "3 channels", "dimmer + 2 channels", "nothing yet"
  ```
- Rules: `resizeGroup` to a smaller size is refused while a mapping's light (`memberOffset ?? 0`, or a range's reach) would be cut: `refusal` returns `notes on <light names> of <row names> would be lost`. A size of `any` is never edited. `setLightName` on a group with no `memberNames` creates the list with the other heads as `1`…`n`; clearing every name removes the list. `setChannel` with `move: false` only changes `defaultMidiChannel`; triggers and sources on `any` never move.

- [ ] **Step 1: Failing tests** — one per edit and refusal; undo/redo walk; `isDirty`/`markSaved`; `channelMoveCount(reauthored, 1)` equals the counts the test itself takes from the fixture file (mappings whose trigger is a note or range on channel 1; bindings whose source is `midi.cc` on channel 1), and is `{ notes: 0, faders: 0 }` for channel 2; `partsOf` is 3 for `flash ×4` and 1 for `red @ note 21` in the collapsed show; `mergeCandidates("flash ×4")` accepts the two other ×4 groups and gives each other group its reason; **round trip:** for each of the four fixture shows, `applyEdit` of a rename then its undo, and a rename alone, leave every other key deep-equal to the file (songs, scenes, overrides, timeline, tempo, clock mode, fallback scene).
- [ ] **Step 2: Run** — `pnpm -F @ptah-app/ds test -- show/model`. Expected: FAIL.
- [ ] **Step 3: Implement.** **Step 4: Gates** — `pnpm -F @ptah-app/ds test -- show && pnpm -F @ptah-app/ds typecheck && pnpm -F @ptah-app/ds build && pnpm check && pnpm format`.
- [ ] **Step 5: Commit** — `feat(ds): the show draft: show, groups, undo`.

---

### Task 8: The show draft — the grid and its notes

**Files:**
- Create: `packages/ds/src/show/model/{grid.ts,notes.ts}`, `__tests__/{grid.test.ts,notes.test.ts}`
- Modify: `packages/ds/src/show/model/{draft.ts,index.ts}`

**Interfaces:**
- Produces:
  ```ts
  // notes.ts
  export function parseNote(text: string): number | null;    // "0".."127", or a name with noteName's convention ("C3" → 60, "c#3", "Db3"); else null
  export type NoteRef = { mappingId: string; note: number; channel: number | "any"; device: string; inRange: boolean };
  export type NoteUse = { instanceId: string; row: string; groupId: string; group: string; light: string | null }; // light null for all/spread
  export function noteUses(show: Show): Map<string, NoteUse[]>;            // key `${channel}:${note}`
  export function stripOf(show: Show, channel: number, groupId: string | null): ("free" | "used" | "group")[]; // 128 entries; notes on `any` count for every channel
  export function readoutOf(show: Show, ref: NoteRef, at: { instanceId: string; light: number | null }): string; // "note 0 · C-2 · ch 1 · also starts strobe arm on Strobe 1"
  // grid.ts
  export type Plays = "per-light" | "all" | "spread";
  export type GridCell = { light: number; closed: boolean; notes: NoteRef[] };
  export type GridRow = { instanceId: string; name: string; kind: "program" | "scene"; enabled: boolean; plays: Plays;
    cells: GridCell[]; wide: NoteRef[]; others: string[]; stray: NoteRef[]; faders: string };
  export function lightNames(group: Group): string[];                       // memberNames or "1".."n"; [] for size any
  export function gridOf(show: Show, groupId: string, programs: Programs): GridRow[];
  export function strayRows(show: Show): { instanceId: string; name: string }[]; // instances whose group is unknown
  // draft.ts gains
  | { kind: "addNote"; id: string; instanceId: string; light: number | null; note: number; channel?: number | "any" }
  | { kind: "removeNote"; mappingId: string; note?: number }   // note: which note of a range to drop
  ```
- Rules: a per-light row's `midi.note` lands in cell `memberOffset ?? 0`; a `midi.noteRange` puts note `from + k` in cell `memberOffset + k` with `inRange: true`; `all`/`spread` rows put notes in `wide`; other trigger kinds become one string each in `others` (`OSC /lights/flash`, `program change 4`, `pad <id>`, `key <k>`); a note whose light is at or past the size, or on a group of size `any`, goes to `stray` (Review Focus 1). `closed` when `instance.members` is a list without that light. `faders` is `CC 3 → level` joined by ` · `, `—` with none; a non-CC source reads as its kind in words. `addNote` uses the show's channel unless given; adding to a per-light row sets `memberOffset` to the light; the same note twice in one cell is refused (`refusal`: `already here`). `removeNote` on a range, and `addNote` into a cell a range reaches, first replace the range by single `midi.note` mappings with fresh ids (kept order), then apply.

- [ ] **Step 1: Failing tests** — `parseNote` table (`"60"`, `"C3"`, `"c#3"`, `"Db3"`, `"128"`, `"H2"`, `""`); `gridOf` on the re-authored show's `pars` gives rows flash, sine, distorded with cells `[1],[3],[5],[6]` etc. and `red` wide `[21]`; `strobe arm` has three notes per cell and `kind: "scene"`; a synthetic range row; closed cells; **Review Focus 1:** a mapping with `memberOffset` 9 on a group of 4, a group of size `any`, an instance with an unknown group, a mapping with an unknown instance: no throw, the notes are in `stray`/`strayRows`, and a save round-trip keeps them; `noteUses`/`readoutOf` for note 0 names `strobe arm on Strobe 1`; `stripOf` marks 0–21; **the anti-goal:** for every fixture show and every single `addNote`/`removeNote` edit drawn from a fixed list, `noteUses` differs from before only at that note; range splitting leaves `noteUses` unchanged.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Gates** as Task 7.
- [ ] **Step 5: Commit** — `feat(ds): the show grid model: notes per program and light`.

---

### Task 9: The show draft — rows, faders, outputs

**Files:**
- Create: `packages/ds/src/show/model/rows.ts`, `__tests__/rows.test.ts`
- Modify: `packages/ds/src/show/model/{draft.ts,index.ts}`

**Interfaces:**
- Produces:
  ```ts
  // draft.ts gains
  | { kind: "addRow"; id: string; groupId: string; programId: string; plays: Plays }
  | { kind: "duplicateRow"; id: string; instanceId: string; groupId: string }  // no notes copied; faders and outputs copied
  | { kind: "moveRow"; instanceId: string; by: -1 | 1 }       // among the rows of its group; show order of other groups untouched
  | { kind: "removeRow"; instanceId: string }                 // its mappings go too
  | { kind: "setRow"; instanceId: string; patch: Partial<{ name: string; enabled: boolean; programId: string; plays: Plays;
        hold: "gate" | "toggle" | "oneshot"; onStop: "release" | "reset" | "hold" }> }
  | { kind: "setFader"; instanceId: string; parameterId: string; cc: number | null; channel?: number | "any" }
  | { kind: "setOutput"; instanceId: string; slot: number; target: OutputTarget }
  // rows.ts
  export type FaderLine = { parameterId: string; name: string; range: string; source: { kind: "none" } | { kind: "cc"; cc: number; channel: number | "any" } | { kind: "other"; text: string } };
  export function faderLines(instance: Instance, program: Program): FaderLine[];   // one per parameter; several bindings → several lines
  export type OutputTarget = { kind: "natural"; part: number | "every" } | { kind: "channel"; channel: number; part: number | "every" } | { kind: "custom" };
  export type OutputLine = { slot: number; kind: string; target: OutputTarget; text: string };
  export function outputLines(instance: Instance, program: Program, parts: number): OutputLine[];
  export function addableProgram(show: Show, programId: string): Show;             // lists the program in show.programs when missing (file `programs/<id>.json`)
  ```
- Rules (§4.4): `addRow` names the row after its program, `trigger.mode` gate, `onStop` reset, `merge` `{ mode: "default", priority: 0 }`, `enabled` true, no `routing` (every output natural), `distribution` from `plays`, `members: "all"`. `setRow.plays` from per-light to `all`/`spread` is refused while more than one light holds notes (`refusal`: `notes on <lights>: move them to one light first`); the other way sets `memberOffset: 0` on its notes. `setRow.programId` keeps the notes, drops bindings whose `parameterId` the new program lacks, and resets `routing` to none; refused for a scene row. `setFader` with `cc: null` removes that parameter's CC bindings and leaves other sources; with a number it replaces the first CC binding of that parameter or adds one (`device: "any"`, the show's channel unless given), keeping `curve` and `invert`. `setOutput` writes the simple route forms only: natural → no `capability`; channel → `capability: { channel }`; `part: "every"` on a group with parts → one route per part; per-light rows route to light `0` (relative), `all` rows to `"all"`. `outputLines` reads those same forms back and answers `custom` for anything else; `setOutput` on other slots never rewrites a `custom` slot's routes.

- [ ] **Step 1: Failing tests** — each edit and refusal; `faderLines` on `distorded (pars)` gives `CC 0` and `CC 1`; `outputLines` reads the collapsed show's `flash ×3` as slots 0–2 → `part 1 of 3`…`part 3 of 3`, `flash ×4` slot 0 → `every part`, the re-authored `flash (strobes)` → channel 0, and a hand-made odd route as `custom`; `setOutput` then `outputLines` round-trips each simple form; a `custom` slot survives edits to its neighbours byte for byte; **round trip:** for the four fixture shows, `setRow` of a name then undo leaves the file deep-equal, and `merge`, `velocityTo`, `heldVoiceCapBeats`, `members`, a binding's `curve` and `invert` survive every edit of this task.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Gates** as Task 7.
- [ ] **Step 5: Commit** — `feat(ds): the show draft: rows, faders and outputs`.

---

### Task 10: The note strip and the note cell (shared parts)

**Files:**
- Create: `packages/ds/src/primitives/NoteStrip/{NoteStrip.tsx,NoteStrip.module.css,NoteStrip.stories.tsx,index.ts}`, `packages/ds/src/show/{NoteCell.tsx,NoteCell.module.css,NoteCell.stories.tsx}`, `packages/ds/src/show/__tests__/notecell.test.tsx`
- Modify: `packages/ds/src/primitives/index.ts`, `packages/ds/scripts/test-visual.mjs` (boards `note-strip-*`, `show-notecell-*`; the tap list gains the NoteCell story)

**Interfaces:**
- Consumes: Task 8's `NoteRef`, `parseNote`; the existing `NoteChip` where it serves (state in the report whether it was reused or why not).
- Produces:
  ```tsx
  export type NoteStripProps = { cells: readonly ("free" | "used" | "group")[]; marked?: number | null;
    onHover?: (note: number | null) => void; label: string };
  export function NoteStrip(props: NoteStripProps): JSX.Element;   // 128 cells, one fixed height, wraps to two rows of 64 below 900 px
  export type NoteCellProps = { notes: readonly NoteRef[]; showChannel: number; wideLabel?: "all together" | "spread";
    closed?: boolean; issue?: "error" | "warning" | null; label: string;         // e.g. "flash on Par 2"
    onAdd: (note: number, channel?: number | "any") => void; onRemove: (ref: NoteRef) => void;
    onFocusNote: (ref: NoteRef | null) => void;
    hold?: { enabled: boolean; onDown: (ref: NoteRef) => void; onUp: () => void } };
  export function NoteCell(props: NoteCellProps): JSX.Element;
  ```
- Behaviour: state-table rows 1–6, 11–13, 16. Enter or click opens the input in place (the cell's box does not change size: the no-shift gate asserts it); typing a note and Enter adds; Backspace on an empty input removes the last chip; Escape closes; a channel field appears in the open cell, blank for the show's channel; text that `parseNote` rejects turns the input fault-coloured and Enter does nothing. A chip is a button: focus or hover calls `onFocusNote`; with `hold.enabled`, pointer down or Space calls `onDown` and pointer up, pointer leave, pointer cancel, blur and Space up call `onUp` exactly once per down. Chips past what fits collapse into `+<n>` (opening the cell shows all in a popover). Arrow keys are the grid's (Task 11), not the cell's.

- [ ] **Step 1: Failing tests** (`notecell.test.tsx`, Testing Library): add by number and by name; reject `H2`; Backspace removes the last; `·ch 2` and `·any` suffixes; closed cell is not focusable; `onUp` fires once on each of pointer up, leave, cancel and blur after a down, and never without one.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** both parts with stories: NoteStrip `well`, `group-marked`, `narrow`; NoteCell `empty`, `one`, `many`, `other-channel`, `range`, `closed`, `open`, `rejected`, `holding`. `open` and `rejected` carry a `noShift` play.
- [ ] **Step 4: Gates** — a primitive is a shared part: `pnpm -F @ptah-app/ds test && pnpm -F @ptah-app/ds typecheck && pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/ds test:storybook && pnpm -F @ptah-app/ds test:visual` (the **full** visual gate; new boards recorded with `--update --only note-strip,show-notecell` and named in the commit) `&& pnpm check && pnpm format`.
- [ ] **Step 5: Commit** — `feat(ds): the note strip and the note cell`.

---

### Task 11: The Show screen — header, groups, grid

**Files:**
- Create: `packages/ds/src/show/{ShowScreen.tsx,ShowScreen.module.css,ShowHeader.tsx,GroupList.tsx,GroupLine.tsx,Grid.tsx,Grid.module.css,Readout.tsx,sample.ts,Show.stories.tsx}`, `packages/ds/src/show/__tests__/grid.test.tsx`
- Modify: `packages/ds/src/show/index.ts`, `packages/ds/scripts/test-visual.mjs` (boards `show-grid-*` at 1280×800)

**Interfaces:**
- Consumes: Tasks 7–10; `Table` is **not** used for the grid (cells are editors with their own focus model): the grid is a `role="grid"` built here, with the Table's tokens for row height and hairlines.
- Produces:
  ```tsx
  export type ShowIssue = { severity: "error" | "warning"; code: string; path: string; message: string };
  export type VenueIssues = { venueId: string; venue: string; patchIndex: number; issues: ShowIssue[] };
  export type CheckState = { state: "ok" | "pending" | "unreachable"; issues: ShowIssue[]; venues: VenueIssues[] };
  export type HoldState = { enabled: boolean; reason: string | null };   // reason: one of the three §4.7 lines
  export type ShowScreenProps = {
    width: number; draft: ShowDraft; programs: Programs; check: CheckState; playing: boolean;
    shows: { id: string; name: string; label: string }[];                // label carries the counts when names collide
    groupId: string | null; onGroup: (id: string) => void;
    openRow: string | null; onOpenRow: (instanceId: string | null) => void;
    onEdit: (edit: ShowEdit) => void; onUndo: () => void; onRedo: () => void; onSave: () => void;
    onShow: (id: string) => void; onNew: () => void; onDuplicate: () => void; onDelete: () => void;
    onAddProgram: (groupId: string) => void; onMerge: (groupId: string) => void;
    hold: HoldState; onHold: (at: { instanceId: string; light: number | null } | null) => void;
    venueHref: (venueId: string) => string;
    details?: React.ReactNode; notice?: React.ReactNode };               // Task 12's panel; the page's fault line
  export function ShowScreen(props: ShowScreenProps): JSX.Element;   // not `Show`: that is the model's type
  export function issuePlace(show: Show, path: string): { groupId?: string; instanceId?: string; light?: number | null } | null; // "/mappings/3/…" → its row and cell; "/groups/1/…" → the group; "/instances/2/…" → the row
  ```
- Layout (§4.1–§4.3, mockup B): header; below it two columns, the group list (fixed width) and the main column: group line, grid, readout (one fixed line), note strip, then the details area (a fixed-height slot rendering `details`, empty otherwise: state-table row 19). Under the group list, when `strayRows` is not empty, a dim `Not on any group` list of those rows' names (Review Focus 1). A group of size `any` shows `any` for its size, no size field and no light columns: its rows list their notes in the row head line. The root follows the scroll rule of the Global Constraints. Below `SHOW_EDIT_WIDTH` it renders nothing but `ShowPhone` (Task 13); until then a placeholder.
- Keyboard: arrows move between cells (and into the wide cell); Enter opens a cell; Tab leaves the grid; the row menu on the row head (`Details`, `Duplicate onto…`, `Move up`, `Move down`, `Disable`/`Enable`, `Delete`). Name fields commit on Enter or blur; a refused edit (`refusal`) shows its line under the field in fault colour and keeps the old value.
- Marks: an issue is drawn where `issuePlace` puts it (cell, row head, group entry) and counted in the header; venue issues are warnings listed from the count, each with a link `venueHref(venueId)`.

- [ ] **Step 1: Failing tests** (`grid.test.tsx`): the re-authored sample renders flash/sine/distorded/red with their notes; arrow keys walk cells; adding a note calls `onEdit` with `addNote` for that row and light; a refused resize shows its reason; `issuePlace` for a mapping, an instance and a group path; hovering a chip fills the readout with `readoutOf`'s text; `playing` and the fault count appear only when set, their places reserved.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**, with stories for state-table rows 1–10, 13, 14, 16, 18: `well`, `playing`, `issues`, `venue-warnings`, `not-checked`, `strobes` (several notes per cell and the scene row), `imported` (the collapsed show: parts), `range-and-others`, `empty-group`, `no-groups`, `unsaved`. `well` carries a `noShift` play that opens a cell, types, adds, and opens a name field.
- [ ] **Step 4: Gates** — `pnpm -F @ptah-app/ds test -- show && typecheck && build && test:storybook`; `node packages/ds/scripts/test-visual.mjs --only show` (record the new boards with `--update --only show-grid`).
- [ ] **Step 5: Commit** — `feat(ds): the Show screen: header, groups and the grid`.

---

### Task 12: Row details and the dialogs

**Files:**
- Create: `packages/ds/src/show/{RowDetails.tsx,RowDetails.module.css}`, `packages/ds/src/show/dialogs/{AddProgramDialog.tsx,MergeDialog.tsx,ChannelDialog.tsx,ShowDialogs.tsx}`, `packages/ds/src/show/{Details.stories.tsx,Dialogs.stories.tsx}`, `packages/ds/src/show/__tests__/{details.test.tsx,dialogs.test.tsx}`
- Modify: `packages/ds/src/show/index.ts`, `packages/ds/scripts/test-visual.mjs` (boards `show-details-*`, `show-dialog-*`; tap list)

**Interfaces:**
- Consumes: Task 9's `faderLines`, `outputLines`, edits; Task 7's `mergeCandidates`, `channelMoveCount`.
- Produces:
  ```tsx
  export function RowDetails(props: { show: Show; instanceId: string; programs: Programs; parts: number;
    onEdit: (edit: ShowEdit) => void; onClose: () => void }): JSX.Element;
  export type ProgramChoice = { showId: string; show: string; id: string; name: string; here: boolean };
  export function AddProgramDialog(props: { open: boolean; choices: ProgramChoice[]; busy: boolean; error: string | null;
    onPick: (choice: ProgramChoice, plays: Plays) => void; onClose: () => void }): JSX.Element;
  export type MergeVenue = { venueId: string; venue: string; patchIndex: number; alike: boolean };
  export function MergeDialog(props: { open: boolean; kept: Group; candidates: { group: Group; ok: boolean; reason: string }[];
    venues: MergeVenue[] | null; busy: boolean; error: string | null;
    onPreview: (groupIds: string[]) => void; onMerge: (groupIds: string[], name: string) => void; onClose: () => void }): JSX.Element;
  export function ChannelDialog(props: { open: boolean; from: number; to: number; notes: number; faders: number;
    onAnswer: (answer: "move" | "new" | "cancel") => void }): JSX.Element;
  export function NewShowDialog(...); export function DeleteShowDialog(props: { …; patches: { venue: string }[]; refusal: string | null });
  export function DeleteGroupDialog(props: { …; rows: string[] }); export function ConflictDialog(...); export function ApplyDialog(...);
  ```
- Behaviour (§4.4, §4.5, §4.6): the details panel lists Name, Program (a `Select` of the show's programs; read-only for a scene), Plays, Notes hold, When it stops, Faders (one line per `FaderLine`: `Select` none/CC, a `NumberField` 0–127, an optional channel; `other` sources as read-only text), Outputs (one line per `OutputLine`: a `Select` of the targets that output kind allows, the part choice only when `parts > 1`, `custom` read-only). `AddProgramDialog` lists this show's programs first, then the others by show, with a search field; it shows `error` (the "different program with that id" line of Review Focus 5 arrives here). `MergeDialog`: tick groups among the candidates (those not `ok` are dim with their reason and cannot be ticked), a name field (default: the kept group's name), then per venue `patch carries over` in dim text or, in fault colour, `<venue>: these groups are on different lights; <kept> keeps its lights`; Merge is enabled once a preview has answered.

- [ ] **Step 1: Failing tests** — details: changing a fader to CC 5 calls `setFader`; an `other` source is read-only; a scene row has no program select; outputs show `part 1 of 3` for the imported sample and no part choice for the re-authored one. Dialogs: a candidate that is not `ok` cannot be ticked; Merge is disabled before a preview; a venue that is not alike renders in fault colour with the kept group's name; the channel dialog shows the counts and answers each of its three ways.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**, stories: details `program-row`, `scene-row`, `imported-parts`, `custom-output`, `many-faders`; dialogs `add-program--open`, `merge--open`, `merge-not-alike--open`, `channel--open`, `delete-show--open`, `delete-group--open`, `conflict--open`, `apply--open`.
- [ ] **Step 4: Gates** — as Task 11 with `--only show`.
- [ ] **Step 5: Commit** — `feat(ds): show row details, merge and the show dialogs`.

---

### Task 13: Phone view, the picker label, and the ds checkpoint

**Files:**
- Create: `packages/ds/src/show/{ShowPhone.tsx,ShowPhone.module.css}`, `packages/ds/src/show/__tests__/phone.test.tsx`
- Modify: `packages/ds/src/show/{ShowScreen.tsx,Show.stories.tsx,index.ts}`, `packages/ds/src/perform/picker/{model.ts,ShowPicker.tsx}` and its tests/stories, `packages/ds/scripts/test-visual.mjs` (`show-phone-390x844`)

**Interfaces:**
- Produces:
  ```tsx
  export function ShowPhone(props: { show: Show; programs: Programs }): JSX.Element;  // §4.9: name, each group with its rows as text, one line that editing needs a wider screen
  export function showLabels(shows: { id: string; name: string; groups: number; instances: number }[]): Map<string, string>;
  // "HILLDALE" when the name is unique; "HILLDALE · 7 groups, 7 rows" for every show of a colliding name (trimmed, case-insensitive); "1 group", "1 row" singular
  ```
  `PickerShow` gains optional `groups` and `instances`; `ShowPicker` labels its rows with `showLabels` (a shared part of Perform).

- [ ] **Step 1: Failing tests** — `showLabels` (unique, colliding, singular); the picker shows two distinguishable rows for the two `HILLDALE` fixture shows; the phone view prints `flash: Par 1 = 1, Par 2 = 3, Par 3 = 5, Par 4 = 6` and `red: all together = 21` and has no button.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**; story `Show/Grid` `phone` at 390×844; a Perform picker story with colliding names.
- [ ] **Step 4: ds checkpoint** — `pnpm -F @ptah-app/ds test && pnpm -F @ptah-app/ds typecheck && pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/ds test:storybook && pnpm -F @ptah-app/ds test:visual` (full: the picker is shared; re-record only boards whose change is the new label, each named in the commit) `&& pnpm check && pnpm format`.
- [ ] **Step 5: Commit** — `feat(ds): the Show phone view; the picker tells same-named shows apart`.

---

### Task 14: The Show page — read, check, save

**Files:**
- Create: `apps/web/src/show/{ShowPage.tsx,useShow.ts,check.ts,saveShow.ts,derive.ts}`, `apps/web/src/show/__tests__/{check.test.ts,saveShow.test.ts,derive.test.ts,page.test.tsx}`
- Modify: `apps/web/src/routes.ts` (`showRoute`, `showPath`, `shipped` gains `"show"`, `screenOf`), `apps/web/src/App.tsx` (the route, `onCommands` for show), `apps/web/src/api/types.ts` (`ShowListItem` gains `groups`, `instances`), `apps/web/src/perform/useEngineData.ts` (pass the counts to the picker), `docs/app.md`

**Interfaces:**
- Consumes: Task 3 and 4's routes; `@ptah-app/ds/show`; `getWithRevision`, `putJson`, `postJson`, `deleteJson`, `HttpError`; `useStream("state")`, `useStream("clock")`; `setLeaveGuard`; the venue page's `Playing` and reload pattern (`apps/web/src/venue/save.ts`).
- Produces:
  ```ts
  // routes.ts
  export type ShowRoute = { id: string | null };
  export function showRoute(path: string): ShowRoute | null;     // "/show", "/show/<id>"
  export function showPath(id?: string | null): string;
  // check.ts
  export type Checker = { push(show: Show): void; stop(): void };
  export function makeChecker(post: (show: Show) => Promise<{ issues: ShowIssue[]; venues: VenueIssues[] }>,
    onState: (s: CheckState) => void, opts?: { delayMs?: number; timers?: Timers }): Checker;   // delayMs 150
  // saveShow.ts
  export interface Api { putShow(show: Show, revision: string | null): Promise<Written>; loadShow(p: NonNullable<Playing>): Promise<CommandAck> }
  export type SaveShowOutcome =
    | { kind: "saved"; revision: string; issues: ShowIssue[] }
    | { kind: "saved-not-applied"; revision: string; issues: ShowIssue[]; reason: string }
    | { kind: "refused"; issues: ShowIssue[] } | { kind: "conflict"; revision: string } | { kind: "failed"; message: string };
  export function saveShow(api: Api, show: Show, revision: string | null, playing: Playing): Promise<SaveShowOutcome>;
  // derive.ts
  export const LAST_SHOW_STORAGE = "ptah.show.last";
  export function resolveShowId(route: string | null, playingId: string | null, last: string | null, shows: { id: string }[]): string | null;
  ```
- Behaviour (§5): opening reads the show with its revision and every program file it lists; edits go through `applyEdit`; each new `current` is pushed to the checker; **only the answer to the latest pushed draft is shown** (Review Focus 3); a failed request gives `unreachable`. Save: `refused` shows the server's issues; `conflict` opens `ConflictDialog` (`Reload` rereads, `Overwrite` saves without `If-Match`); when this show is playing, a successful save reloads it on the same venue and patch, after `ApplyDialog` if the clock runs; a refused reload is `saved-not-applied`, shown as the page's fault `notice` with the engine's reason and a link to that venue's Patch page until the next successful save. `setChannel` goes through `ChannelDialog` when `channelMoveCount` is not zero. New show: `NewShowDialog` → a draft from `newShow` at `/show/<new id>`, saved by Save (the name rule answers there). The leave guard asks with unsaved changes; switching show goes through it. Palette commands: `New show`, `Duplicate show`, `Add group`, `Add program`, `Merge groups`, `Save`, and `Go to <group>` for each group. (Duplicate, Delete, Add program, Merge and hold are wired in Task 15; until then their handlers are absent and their controls disabled.)

- [ ] **Step 1: Failing tests** — `check.test.ts` with fake timers: three pushes within 150 ms make one request; an answer to an older push is dropped when a newer push is pending or answered; `stop()` then a late answer changes nothing; a rejected request gives `unreachable` and the next push recovers. `saveShow.test.ts`: each outcome, the reload called only when playing, `saved-not-applied` carrying the engine's message. `derive.test.ts`: route, then playing, then last, then first. `page.test.tsx` (the venue page's test style, API mocked): a typed note reaches a `PUT` body on Save; the fault count comes from the check answer; switching show with unsaved changes asks.
- [ ] **Step 2: Run** — `pnpm -F @ptah-app/web test -- show`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Gates** — `pnpm -F @ptah-app/web test && pnpm -F @ptah-app/web typecheck && pnpm -F @ptah-app/web build && pnpm check && pnpm format`.
- [ ] **Step 5: Commit** — `feat(web): the Show page reads, checks on the server and saves`.

---

### Task 15: Shows menu, add program, merge, hold to play

**Files:**
- Create: `apps/web/src/show/{audition.ts,actions.ts}`, `apps/web/src/show/__tests__/{audition.test.ts,actions.test.ts}`
- Modify: `apps/web/src/show/{ShowPage.tsx,useShow.ts}`

**Interfaces:**
- Consumes: Task 5's routes, Task 6's command, `holdFlash`'s pattern (`apps/web/src/venue/flash.ts`), `ShowInfo.instanceIds` and `showEpoch`.
- Produces:
  ```ts
  // audition.ts
  export const AUDITION_REPEAT_MS = 500;
  export function holdReason(a: { playing: boolean; dirty: boolean; clockRunning: boolean }): string | null; // "load this show first" | "save first" | "Reaper is running" | null, in that order
  export function holdAudition(send: (on: boolean) => Promise<unknown>, env?: { doc?: Document; win?: Window }): () => void;
  // sends on at once and every 500 ms; the returned stop sends off once; also stops by itself on window blur and on visibilitychange to hidden
  export function auditionCommand(info: ShowInfo, instanceId: string, light: number | null, on: boolean): object | null; // null when the instance is not in info.instanceIds
  // actions.ts — each returns what the page should do next, API injected
  export function duplicateShow(api, id): Promise<{ id: string }>;
  export function deleteShow(api, id, playing: Playing): Promise<{ kind: "deleted" } | { kind: "refused"; reason: string }>; // reloads the playing show at playingPatchIndex when the answer has one
  export function addProgram(api, show: Show, choice: ProgramChoice): Promise<{ kind: "ready"; show: Show } | { kind: "differs" }>;
  export function previewMerge(api, id, show: Show, groupIds: string[], name: string): Promise<{ show: Show; venues: MergeVenue[] } | { refused: string }>;
  ```
- Behaviour: Duplicate asks nothing, then opens the copy; Delete opens `DeleteShowDialog` naming the venue patches, shows a refusal's reason (`show in use` → `this show is playing`, `clock running` → `Reaper is running`), and afterwards opens the playing show or the first. Add program: `AddProgramDialog` fed by `GET /programs`; a choice from another show calls `copy-from` first; `differs` shows `this show already has a different program with that id` in the dialog; then `addableProgram` + `addRow` as one undo step, and the copied program is read into `programs`. Merge: tick → `previewMerge` → the dialog's venues; Merge applies the answer's show as `replaceShow`. Hold: `onHold(at)` starts `holdAudition` when `holdReason` is null, else the readout shows the reason; `onHold(null)`, unmount, switching show or group, and a draft becoming dirty all stop it (Review Focus 4).

- [ ] **Step 1: Failing tests** — `audition.test.ts` (fake timers, a fake window and document): `on` at 0, 500, 1000 ms; stop sends one `off` and no more `on`; window blur, `visibilitychange` to hidden, and a second stop each end it exactly once; `holdReason` order; `auditionCommand` maps an instance id to its index with the epoch, and is null for an unknown id. `actions.test.ts`: delete reloads the playing show at the answered index; a 409 becomes its reason; `addProgram` copies only for another show's program and reports `differs`; `previewMerge` passes the draft, not the saved show.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Gates** as Task 14.
- [ ] **Step 5: Commit** — `feat(web): duplicate, delete, add programs, merge groups, hold a note to play it`.

---

### Task 16: End to end, docs, the full gate

**Files:**
- Create: `apps/web/e2e/show.spec.ts`
- Modify: `apps/web/e2e/engine.ts` (helpers as needed), `apps/web/e2e/scroll.spec.ts` (the Show page), `docs/{app.md,api.md,engine.md}`, `docs/ledgers/show-owner-check.md` (new)

- [ ] **Step 1: Failing e2e tests** against the real binary (`startEngine({ artnet })`, `listenArtnet`, as `venue.spec.ts`):

```ts
test("moving a note to another light moves the light, without a restart")
// open /show on the synthetic show, move a row's note from light 1 to light 2, Save (the show is playing: it reloads);
// the bar position keeps counting across the save (no restart); then hold the moved chip:
// expect.poll the captured channels of light 2's fixture to move while light 1's stay
test("merging two groups keeps the frames, with no patch work")
// a fixture tree with two same-shape groups patched alike: record channels for a fixed audition sequence, merge, Save, record again: equal
test("holding a chip plays it, releasing stops it, closing the page stops it")
test("holding is refused while the clock runs, and says why")
test("a draft problem shows without saving")       // grow a patched group by one light: the venue warning appears with its link, nothing is written (the file's revision is unchanged); rename to another show's name: the field says `another show has this name` and Save is refused
test("a new show with a program copied from another plays once patched")       // exit 4, the patch proposed through the API
test("two shows cannot be given the same name")
test("a long show scrolls inside the page, never the window")                  // in scroll.spec.ts
```

- [ ] **Step 2: Run** — `cargo build -p ptah && pnpm -F @ptah-app/web test:e2e -- show`. Expected: FAIL where the feature is exercised for the first time end to end; fix what it finds in the owning package with a unit test there.
- [ ] **Step 3: Docs** — `docs/app.md` (the Show page: routes, check, save and apply, hold), `docs/api.md` and `docs/engine.md` complete for Tasks 3–6; `docs/ledgers/show-owner-check.md`: the six exit checks of §8 as steps the owner can follow on the rig, including how to load the show and which venue to use.
- [ ] **Step 4: The full gate** — `pnpm allcheck`. Expected: exit 0 (TS and Rust halves, the full visual gate, e2e).
- [ ] **Step 5: Commit** — `test(web): the Show screen end to end`, `docs: the Show screen, its routes and the audition command`.
