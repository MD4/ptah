# Fixture Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Any real light becomes describable in PTAH V2: the Open Fixture Library (OFL) ships inside the app as a converted catalogue, a Library screen finds, imports, adapts and keeps types, and a small editor covers what OFL lacks.

**Architecture:** A Rust converter (`ptah-model/src/import/ofl`) turns one pinned OFL checkout into `library/ofl-catalog.json`, committed and embedded in the server like the web app. The server serves the catalogue, imports entries, and guards type saves (revision check, in-use impact, refusal when a venue would stop loading). The Library screen's parts and pure draft model live in the design system (`packages/ds/src/library`); `apps/web` wires them; the Venue type picker searches both sources.

**Tech Stack:** Rust 1.93 (serde, `uuid` v5 already in the workspace, axum, `include_dir`), React 19 + the ds, Vitest, Storybook gates, Playwright 1.59.1, Biome, cargo-nextest 0.9.150.

**Spec:** `docs/superpowers/specs/2026-11-16-v2-fixture-types-design.md` (V1 repo, commit 0216a84). Executors read it first; § numbers below refer to it.

## Global Constraints

- Repo `~/projects/ptah-v2`, branch `fixture-types` from `master` (c3498f0 or later). V1 (`~/projects/ptah`) is never modified except this plan.
- Never start V1 services or pm2; never touch `~/.ptah` or `~/ptah-home`; tests use temp roots and free ports; the owner's Storybook servers on 6006–6008 stay up; no outward pushes.
- No new outside dependency (`uuid` with `v5` is already in the workspace). If one becomes necessary: stop and ask the owner; published ≥ 14 days earlier, pinned exactly.
- No network at build time or run time. Only Task 2 (test fixtures) and Task 3 (the catalogue) download from OFL, once, at the pinned commit `2fc6128964335bcac14d6429eea5e1eb690db5d8` (2026-11-16), by hand in the task.
- OFL is MIT-licensed: its notice is committed as `library/OFL-LICENSE` and next to any vendored OFL test file, and the app shows `Bundled from Open Fixture Library, <date>, MIT licence`.
- Biome only; tokens-only styling; no shadows but the focus ring; 44 px targets on a coarse pointer; nothing shifts at run time; calm when well, loud only when wrong; every action reachable by keyboard.
- Stage by explicit path only; leave the untracked `docs/design/brief/` and `.ignore` alone.
- Exact copy (§4, §5, §6): filter `All`, `Mine`, `Bundled`; marks `mine`, `bundled`, `clean`, `simplified`; row actions `Edit`, `Duplicate`, `Delete`, `Import`; `New type`; `← Library`; `Paste a channel list`; picker entries `New type…`, `Open the Library`; warning actions `Save anyway` / `Cancel`; conflict `This type changed on disk` with `Reload` / `Overwrite`; simplified reasons exactly `<N> pixels act as one light`, `a switching channel uses its default meaning`, `a 24-bit channel keeps 16 bits`, `a channel mixing several functions is generic`, `the shutter may start closed`.
- Exact values: catalogue file `library/ofl-catalog.json`, schema tag `oflCatalog@1`; id namespace `3d2f6c9a-51b7-4e0e-9c4e-6f6c5f747970`; mode ids match `^[a-z0-9]+(-[a-z0-9]+)*$` and never change once created; editing width 900 px.
- Conventions (owner, 2026-11-16): failing test first with the RED output in the report; a Rust task runs in its own worktree whose `target/` is cloned from the main checkout (`cp -c -R`); at most three agents at once; a UI task runs `test:visual -- --only <its boards>` and Storybook for its own stories, the full gates run at the checkpoints (Task 5 for Rust with `cargo nextest run --workspace`, Task 9 for the ds, `pnpm allcheck` in Task 13).
- Conventional Commits with scopes (`feat(model)`, `feat(server)`, `feat(ds)`, `feat(web)`, `test(web)`, `docs`, `build`).

## Execution order

- Task 1 first (both tracks need its rules).
- **Rust:** 2 → 3 → 4 → 5. **Design system:** 6 → 7 → 8 → 9. One task of each track at a time, their reviews alongside (three agents at most).
- Then 10 → 11 → 12 (web; 11 needs 5 and 9; 12 needs 4 and 10), then 13.

## Review Focus

1. **Reordering or deleting a channel that has a fine byte.** `fineOf` is a channel index: after a move the fine byte must still point at its coarse channel, and deleting the coarse channel clears the fine byte's `fineOf`. Test in Task 6.
2. **An OFL mode with `null` channel slots or a channel key missing from `availableChannels`.** The slot becomes a generic channel named `Unused` (addresses stay right); a missing key skips the fixture with its reason. Test in Task 2.
3. **A pasted channel list from a real manual:** tabs, `CH1:`, `1 - Dimmer (0-255)`, blank lines, a header line, repeated names. Every non-blank line becomes a channel (never dropped silently); what cannot be read keeps the typed text as its name with role generic. Test in Task 6.
4. **Importing a bundled entry whose id already exists as an edited type of the owner's.** Nothing is overwritten; the existing type opens. Tests in Task 4 and Task 11.
5. **The impact of a type save when one venue file is itself broken or names an unknown mode.** The impact answers for the venues that load and lists the unreadable ones by file name; it never answers 500 and never blocks the save for a venue that was already unloadable. Test in Task 5.

---

### Task 1: New rules for a type, on both sides

**Files:**
- Modify: `crates/ptah-model/src/lint/fixture_type.rs`, `packages/model-tools/src/fixtureType.ts`, `packages/model-tools/src/scripts/write-model-oracles.ts`, `fixtures/oracles/model/lint-cases.json` and `lint-issues.json` (regenerated), `crates/ptah-model/tests/oracles.rs` (the expected count `("fixtureType", 2)` → 9), `docs/schemas.md` if it lists lint codes
- Test: `packages/model-tools/src/__tests__/` (the file that covers `lintFixtureType`), `crates/ptah-model/src/lint/fixture_type.rs` (unit), the oracle tests on both sides

**Interfaces:**
- Produces: seven error-level codes, emitted in this order within a mode (modes in file order): `mode-empty` at `/modes/{m}/channels`; `duplicate-mode-id` at `/modes/{m}/id` (on each later mode repeating an id); then per channel `c` in order: `fine-of-self`, `fine-of-fine` (the target itself has `fineOf`), `fine-of-duplicate` (an earlier channel is already the fine byte of that target), all at `/modes/{m}/channels/{c}/fineOf` and only when `fineOf` is in range; then per range `r`: `range-reversed` (`from > to`) and `range-overlap` (it shares a value with an earlier, non-reversed range of that channel) at `/modes/{m}/channels/{c}/ranges/{r}`. The two existing codes keep their place before these. Messages are the same strings on both sides (the oracle compares them).

- [ ] **Step 1: Failing TypeScript tests**, one per code, on the example mover (`fixtures/library/types/example-mover-16bit.json`): e.g. `fine-of-self` after setting channel 1's `fineOf` to 1 gives exactly one issue with that code and path `/modes/0/channels/1/fineOf`; `range-overlap` after setting the gobo ranges to `0–127` and `100–255` gives one issue at `/modes/0/channels/10/ranges/1`; `mode-empty` after emptying the channels (and setting `channelCount: 0`) gives one issue at `/modes/0/channels`. Also: all eight types in `fixtures/library/types/` are clean.
- [ ] **Step 2: Run** — `pnpm -F @ptah-app/model-tools test -- fixtureType`. Expected: FAIL.
- [ ] **Step 3: Implement in TypeScript**, add one oracle case per code to `write-model-oracles.ts` (the generator's own list of expected codes gains the seven), and regenerate: `pnpm -F @ptah-app/model-tools oracles:model`.
- [ ] **Step 4: Failing Rust test** — bump the expected count to 9 in `tests/oracles.rs`; `cargo nextest run -p ptah-model lint_cases` fails on the new cases.
- [ ] **Step 5: Implement in Rust**; the oracle test passes (same codes, paths, messages, order).
- [ ] **Step 6: Gates** — `pnpm -F @ptah-app/model-tools test && pnpm -F @ptah-app/model-tools typecheck`; `cargo fmt --all --check && cargo clippy -p ptah-model --all-targets -- -D warnings && cargo nextest run -p ptah-model -p ptah-server`; `pnpm check && pnpm format`.
- [ ] **Step 7: Commit** — `feat(model): a fixture type's modes, fine bytes and ranges are checked`.

---

### Task 2: The OFL converter

**Files:**
- Create: `crates/ptah-model/src/import/ofl/{mod.rs,shapes.rs,roles.rs,convert.rs}`, `fixtures/ofl/` (vendored OFL test files with `LICENSE`), `fixtures/oracles/model/ofl/*.json` (expected types), `crates/ptah-model/tests/ofl.rs`
- Modify: `crates/ptah-model/src/import/mod.rs` (export)

**Interfaces:**
- Produces:
  ```rust
  pub const OFL_NAMESPACE: uuid::Uuid; // 3d2f6c9a-51b7-4e0e-9c4e-6f6c5f747970
  /// The type id of an OFL key (`<manufacturer>/<fixture>`): UUID v5 of the key in OFL_NAMESPACE.
  pub fn type_id(key: &str) -> String;
  #[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)] #[serde(rename_all = "lowercase")]
  pub enum Grade { Clean, Simplified }
  #[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
  pub struct Conversion { pub grade: Grade, pub reasons: Vec<String> } // reasons: unique, in first-seen order
  #[derive(Debug, Clone, PartialEq)]
  pub struct Converted { pub fixture_type: FixtureType, pub conversion: Conversion }
  /// Convert one OFL fixture. `manufacturer` is its display name (OFL `manufacturers.json`);
  /// `fetched_at` is the pinned commit's date (RFC 3339). Err = skipped, with the reason.
  pub fn convert(key: &str, manufacturer: &str, fixture: &serde_json::Value, fetched_at: &str) -> Result<Converted, String>;
  ```
- Rules: spec §4.2 and §4.3 in full, plus Review Focus 2. A converted type always passes `lint_fixture_type` (Task 1) and the schema; otherwise `convert` returns `Err`.

- [ ] **Step 1: Vendor the test fixtures.** From OFL at the pinned commit (`https://raw.githubusercontent.com/OpenLightingProject/open-fixture-library/2fc6128964335bcac14d6429eea5e1eb690db5d8/fixtures/<maker>/<fixture>.json`), download into `fixtures/ofl/<maker>/<fixture>.json` one fixture of each kind and record which you chose in `fixtures/ofl/README.md`: a 1-channel dimmer; an RGBW par with several modes; a 16-bit mover with a gobo wheel and a colour wheel; a pixel bar (matrix + template channels); a fixture with a switching channel; a strobe or par whose shutter channel has `Open`/`Closed` ranges and no `defaultValue`; a fixture with a `null` slot in a mode. Add `fixtures/ofl/manufacturers.json` (the names you need) and `fixtures/ofl/LICENSE` (OFL's MIT text).
- [ ] **Step 2: Write the expected types by hand** for each, as `fixtures/oracles/model/ofl/<maker>--<fixture>.json` (`{ "conversion": …, "type": … }`), from the fixture's manual-level meaning and §4.2, before writing the converter. State in the report how each was derived.
- [ ] **Step 3: Failing tests** in `tests/ofl.rs`:

```rust
#[test] fn each_vendored_fixture_converts_to_its_oracle()        // convert(..) == the oracle file, field for field
#[test] fn ids_are_stable_and_derived_from_the_key()             // type_id("cameo/…") twice equal; a v5 UUID; differs per key
#[test] fn every_converted_type_passes_schema_and_lint()
#[test] fn a_pixel_bar_is_simplified_with_its_pixel_count()      // reasons == ["8 pixels act as one light"] (the bar's own count)
#[test] fn a_switching_channel_takes_its_default_meaning()       // reason present; the channel's role is that of the default alternative
#[test] fn a_shutter_with_no_default_opens()                      // default == the first value of its Open range; grade unaffected
#[test] fn a_shutter_that_can_only_start_closed_is_simplified()  // synthetic fixture: reason "the shutter may start closed"
#[test] fn a_third_fine_byte_is_generic_and_simplified()         // "a 24-bit channel keeps 16 bits"; no fineOf on it
#[test] fn a_null_slot_is_an_unused_generic_channel()            // name "Unused", role generic; channelCount unchanged
#[test] fn a_mode_naming_a_missing_channel_skips_the_fixture()   // Err containing the channel key
#[test] fn mode_ids_have_the_schema_form_and_are_unique()        // "8 Channel (Extended)" → "8-channel-extended"; a repeat gets "-2"
#[test] fn converting_twice_gives_identical_json()
```

- [ ] **Step 4: Run** — `cargo nextest run -p ptah-model --test ofl`. Expected: FAIL.
- [ ] **Step 5: Implement.** `shapes.rs` reads OFL tolerantly (`serde_json::Value` walks or permissive structs: unknown keys ignored; this format changes); `roles.rs` holds the capability → role table of §4.2 and the "most DMX values" rule; `convert.rs` the rest.
- [ ] **Step 6: Gates** — `cargo fmt --all --check && cargo clippy -p ptah-model --all-targets -- -D warnings && cargo nextest run -p ptah-model`.
- [ ] **Step 7: Commit** — `feat(model): convert an Open Fixture Library fixture to a PTAH type`.

---

### Task 3: The catalogue and its build command

**Files:**
- Create: `crates/ptah-model/src/import/ofl/catalog.rs`, `crates/ptah/src/cmd/library.rs`, `library/ofl-catalog.json`, `library/ofl-report.txt`, `library/OFL-LICENSE`, `crates/ptah-model/tests/ofl_catalog.rs`, `docs/library.md`
- Modify: `crates/ptah/src/main.rs` and `cmd/mod.rs` (the hidden `library` command), `crates/ptah-model/src/import/ofl/mod.rs`

**Interfaces:**
- Consumes: Task 2's `convert`, `type_id`, `Conversion`.
- Produces:
  ```rust
  #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
  pub struct Catalog { pub schema: String /* "oflCatalog@1" */, pub ofl: OflPin, pub entries: Vec<CatalogEntry> }
  #[derive(…)] pub struct OflPin { pub commit: String, pub date: String /* YYYY-MM-DD */ }
  #[derive(…)] pub struct CatalogEntry { pub key: String, pub conversion: Conversion, #[serde(rename = "type")] pub fixture_type: FixtureType }
  pub struct BuildReport { pub clean: usize, pub simplified: usize, pub skipped: Vec<(String /*key*/, String /*reason*/)> }
  /// Convert every `fixtures/<maker>/<fixture>.json` under `ofl_dir`; entries sorted by key.
  pub fn build_catalog(ofl_dir: &Path, commit: &str, date: &str) -> std::io::Result<(Catalog, BuildReport)>;
  /// The catalogue as text: a header, then one entry per line (so a refresh diffs per fixture), a trailing newline.
  pub fn write_catalog(catalog: &Catalog) -> String;
  pub fn read_catalog(text: &str) -> Result<Catalog, String>;
  ```
  CLI: `ptah library build --ofl <dir> --commit <sha> --date <YYYY-MM-DD> --out <file> [--report <file>]` (hidden: `#[command(hide = true)]`). It never downloads.

- [ ] **Step 1: Failing tests** in `tests/ofl_catalog.rs`, on `fixtures/ofl/` (Task 2) as a mini library:

```rust
#[test] fn the_mini_library_builds_sorted_with_one_entry_per_fixture()
#[test] fn the_text_form_round_trips_and_has_one_entry_per_line()   // read_catalog(write_catalog(c)) == c; lines == entries + header/footer lines
#[test] fn building_twice_gives_identical_text()
#[test] fn a_skipped_fixture_is_reported_and_absent()               // add a broken file in a temp copy
#[test] fn the_committed_catalogue_is_valid()
// reads library/ofl-catalog.json: schema tag; ofl.commit == "2fc6128964335bcac14d6429eea5e1eb690db5d8";
// every entry: type.id == type_id(key), source.kind == "ofl" with that key, passes schema + lint_fixture_type; ids unique;
// counts equal the constants CLEAN, SIMPLIFIED (and SKIPPED from library/ofl-report.txt) written in this test after the real build.
```

- [ ] **Step 2: Run** — `cargo nextest run -p ptah-model --test ofl_catalog`. Expected: FAIL.
- [ ] **Step 3: Implement** the catalogue code and the command.
- [ ] **Step 4: Build the real catalogue.** In a scratch directory outside the repo: `git clone https://github.com/OpenLightingProject/open-fixture-library && git -C open-fixture-library checkout 2fc6128964335bcac14d6429eea5e1eb690db5d8`; then `cargo run -p ptah -- library build --ofl <that dir> --commit 2fc6128964335bcac14d6429eea5e1eb690db5d8 --date 2026-11-16 --out library/ofl-catalog.json --report library/ofl-report.txt`; copy OFL's `LICENSE` to `library/OFL-LICENSE`. Fill the test's count constants from the report. Read the report: any skip reason that looks like a converter gap (not a broken OFL file) is fixed in the converter with a test first; list the remaining skips in your report with a sentence each.
- [ ] **Step 5: Spot-check five entries by eye** against OFL's site or the files (one clean par, one mover, one pixel bar, one with a switching channel, one strobe) and record what you compared in the report.
- [ ] **Step 6: Docs** — `docs/library.md`: what the catalogue is, the refresh steps (clone at a commit, run the command, review the diff and the report, update the pinned commit in the test, commit), the grades and their reasons.
- [ ] **Step 7: Gates** — `cargo fmt --all --check && cargo clippy -p ptah-model -p ptah --all-targets -- -D warnings && cargo nextest run -p ptah-model -p ptah`; `pnpm check && pnpm format`.
- [ ] **Step 8: Commit** — `feat(model): the bundled Open Fixture Library catalogue and its build command`.

---

### Task 4: Server: the catalogue, import, and a fuller type list

**Files:**
- Create: `crates/ptah-server/src/http/library.rs`
- Modify: `crates/ptah-server/build.rs` (stage `../../library/ofl-catalog.json` into `$OUT_DIR`, `rerun-if-changed`), `crates/ptah-server/src/http/mod.rs` (routes), `crates/ptah-server/src/http/files.rs` (`list_types`), `docs/api.md`
- Test: `crates/ptah-server/tests/http.rs`

**Interfaces:**
- Consumes: Task 3's `read_catalog`, `Catalog`.
- Produces (under `/api/v1`):
  - `GET /library/catalog` → `{ "ofl": { "commit", "date" }, "entries": [ { "id", "key", "name", "manufacturer", "modes": [ { "name", "channelCount" } ], "conversion": { "grade", "reasons" } } ] }` (the embedded file parsed once, lazily).
  - `GET /library/catalog/{id}` → `{ "key", "conversion", "type": <fixtureType@1> }`; 404 unknown id.
  - `POST /library/catalog/{id}/import` → `{ "type": <the type now on disk>, "imported": true|false }`: writes the entry to `library/types/<id>.json` only when no type has that id (under the write lock); when one exists it is returned untouched with `imported: false`. 404 unknown id.
  - `GET /library/licence` → OFL's licence notice as `text/plain` (`library/OFL-LICENSE`, staged and embedded like the catalogue). The Library footer's link opens it.
  - `GET /types` items become `{ "id", "name", "manufacturer", "source": "custom"|"ofl", "oflKey"?: string, "modes": [ { "id", "name", "channelCount" } ] }`.

- [ ] **Step 1: Failing tests** in `tests/http.rs`:

```rust
#[test] fn the_catalogue_index_lists_entries_with_grades_and_the_pin()
#[test] fn a_catalogue_entry_is_a_full_type_and_an_unknown_id_is_404()
#[test] fn import_writes_the_type_once_and_never_overwrites()
// POST → imported true, the file exists and GET /types/{id} returns it; edit it (PUT a renamed copy); POST again → imported false, the renamed type returned, the file unchanged (Review Focus 4)
#[test] fn the_type_list_carries_maker_source_and_modes()
#[test] fn the_licence_notice_is_served_as_text()
```

- [ ] **Step 2: Run** — `cargo nextest run -p ptah-server --test http library`. Expected: FAIL.
- [ ] **Step 3: Implement.** The Venue page already reads `GET /types` for `id` and `name`; the added fields are additive.
- [ ] **Step 4: Docs** — `docs/api.md`.
- [ ] **Step 5: Gates** — `cargo fmt --all --check && cargo clippy -p ptah-server --all-targets -- -D warnings && cargo nextest run -p ptah-server`; `pnpm -F @ptah-app/web typecheck`; `pnpm check && pnpm format`.
- [ ] **Step 6: Commit** — `feat(server): the bundled catalogue, import, and a fuller type list`.

---

### Task 5: Server: guarded type saves

**Files:**
- Create: `crates/ptah-model/src/impact.rs`
- Modify: `crates/ptah-model/src/lib.rs`, `crates/ptah-server/src/http/files.rs` (`get_type`, `put_type`, new handlers; generalise `check_revision`'s wording), `crates/ptah-server/src/http/mod.rs`, `docs/api.md`
- Test: `crates/ptah-model/src/impact.rs` (unit), `crates/ptah-server/tests/http.rs`

**Interfaces:**
- Produces (Rust, pure):
  ```rust
  #[derive(Debug, Clone, PartialEq, Serialize)] #[serde(rename_all = "camelCase")]
  pub struct FixtureImpact { pub id: String, pub name: String, pub mode_id: String, pub before: u16, pub after: u16,
                             pub overflow: bool, pub overlaps: Vec<String> /* other fixtures' names */ }
  #[derive(…)] pub struct LostCapability { pub show_id: String, pub show_name: String, pub group_id: String, pub group_name: String }
  #[derive(…)] pub struct VenueImpact { pub id: String, pub name: String, pub fixtures: Vec<FixtureImpact>, pub lost_capabilities: Vec<LostCapability> }
  #[derive(…)] pub struct RemovedMode { pub mode_id: String, pub venues: Vec<String> /* names */ }
  #[derive(…)] pub struct Impact { pub venues: Vec<VenueImpact>, pub removed_modes: Vec<RemovedMode>, pub unreadable: Vec<String> /* venue file names */,
                                  pub changes: bool /* a footprint or a used mode's channel order changes */,
                                  pub blocked: bool /* an overflow, or a removed mode that fixtures use */ }
  /// What saving `new` in place of `old` (None = a new type) does to the loaded tree.
  pub fn type_impact(old: Option<&FixtureType>, new: &FixtureType, loaded: &Loaded) -> Impact;
  pub fn type_uses(type_id: &str, loaded: &Loaded) -> Vec<VenueUse>; // { id, name, fixtures: [{ id, name, modeId }] }
  ```
  `overflow` and `overlaps` are computed against the venue as it would be after the save; a fixture that already overflowed or overlapped the same neighbours before is not reported as new (`blocked` only for an overflow this save causes).
- Produces (HTTP):
  - `GET /types/{id}` adds `ETag`; `PUT /types/{id}` honours `If-Match` exactly as the venue routes do (409 `{ "error": "type changed on disk", "revision" }`, 400 `bad-if-match`), under the same write lock, and its success body gains `revision`.
  - `GET /types/{id}/uses` → `{ "venues": [ … ] }`.
  - `POST /types/{id}/impact` with the draft type as body → the `Impact` JSON; writes nothing; 422 for a body that is not a type.
  - `PUT /types/{id}`: when `type_impact(..).blocked`, answers 409 `{ "error": "type in use", "impact": <Impact> }` and writes nothing. (A merely `changes: true` save is written: asking first is the page's job.)
  - `DELETE /types/{id}` → 200 `{ "ok": true }`; 404; 409 `{ "error": "type in use", "uses": [ … ] }` while any fixture uses it.

- [ ] **Step 1: Failing unit tests** in `impact.rs` (build small trees in memory, as `lint/venue.rs` tests do):

```rust
#[test] fn an_unused_type_has_no_impact()
#[test] fn a_longer_mode_reports_before_and_after_and_the_new_overlap()   // 4 → 6 channels at 17 beside a fixture at 21: overlaps == ["Back par 4"], changes, !blocked
#[test] fn a_fixture_pushed_past_512_blocks()                             // at 509 with 4 → 6: overflow, blocked
#[test] fn an_overlap_that_existed_before_is_not_reported_as_new()
#[test] fn removing_a_used_mode_blocks_and_names_the_venues()
#[test] fn removing_an_unused_mode_changes_nothing()
#[test] fn a_lost_role_names_the_shows_and_groups_that_need_it()          // the type loses `white`; a patched group requires colour with white → listed
#[test] fn reordering_channels_of_a_used_mode_is_a_change_without_overlap()
```
and in `tests/http.rs`:
```rust
#[test] fn a_type_get_carries_its_revision_and_a_stale_put_is_refused()
#[test] fn impact_answers_without_writing()
#[test] fn a_put_that_would_stop_a_venue_loading_is_refused_with_the_impact()   // 409 "type in use"; file unchanged; GET /venues still lists the venue
#[test] fn a_put_that_only_overlaps_is_written()
#[test] fn impact_survives_a_broken_venue_file()                                // Review Focus 5: one venue file is invalid JSON → 200, it is in `unreadable`, the others are answered, blocked is false for it
#[test] fn delete_refuses_a_used_type_and_removes_an_unused_one()
#[test] fn uses_lists_venues_and_fixtures()
```

- [ ] **Step 2: Run** — `cargo nextest run -p ptah-model impact && cargo nextest run -p ptah-server --test http type`. Expected: FAIL.
- [ ] **Step 3: Implement.** Reuse `if_match`, the revision helper and `lock_venues` (rename them neutrally if you touch them; keep the venue routes' behaviour and tests unchanged).
- [ ] **Step 4: Docs** — `docs/api.md`.
- [ ] **Step 5: Full Rust checkpoint** — `cargo fmt --all --check && cargo clippy --all-targets -- -D warnings && cargo nextest run --workspace`. Expected: PASS (re-run a budget test alone if it fails under load, and report both runs).
- [ ] **Step 6: Commit** — `feat(server): type saves check the revision and what they do to venues`.

---

### Task 6: The Library's pure model

**Files:**
- Create: `packages/ds/src/library/model/{draft.ts,paste.ts,rows.ts,index.ts}`, `packages/ds/src/library/model/__tests__/{draft.test.ts,paste.test.ts,rows.test.ts,roundtrip.test.ts}`

**Interfaces:**
- Consumes: `lintFixtureType` and the types `FixtureType`, `Mode`, `Channel`, `Range`, `Role`, `Issue` from `@ptah-app/model-tools` (add `fixtureType` to its `exports` map if it is not there); `newId` from `../../venue/model/ids`.
- Produces:
  ```ts
  export type TypeDraft = { base: FixtureType; current: FixtureType; past: FixtureType[]; future: FixtureType[] };
  export type ChannelPatch = Partial<Pick<Channel, "name" | "role" | "fineOf" | "default" | "invert">>; // fineOf: null clears it
  export type TypeEdit =
    | { type: "setName"; name: string } | { type: "setManufacturer"; manufacturer: string }
    | { type: "addMode"; name: string } | { type: "renameMode"; modeId: string; name: string }
    | { type: "duplicateMode"; modeId: string; name: string } | { type: "removeMode"; modeId: string }
    | { type: "addChannel"; modeId: string } | { type: "setChannel"; modeId: string; index: number; patch: ChannelPatch }
    | { type: "moveChannel"; modeId: string; from: number; to: number }
    | { type: "duplicateChannel"; modeId: string; index: number } | { type: "removeChannel"; modeId: string; index: number }
    | { type: "setRanges"; modeId: string; index: number; ranges: Range[] }
    | { type: "replaceChannels"; modeId: string; channels: Channel[] };
  export function openDraft(type: FixtureType): TypeDraft;
  export function applyEdit(d: TypeDraft, e: TypeEdit): TypeDraft;       // the same object when refused or a no-op
  export function undo(d: TypeDraft): TypeDraft; export function redo(d: TypeDraft): TypeDraft;
  export function isDirty(d: TypeDraft): boolean; export function markSaved(d: TypeDraft): TypeDraft;
  export function draftIssues(d: TypeDraft): Issue[];                     // lintFixtureType(d.current)
  export function blocksSave(issues: readonly Issue[]): boolean;
  /** A mode id in the schema's form from a name, unique among `taken`: "8 Channel (Ext)" → "8-channel-ext", then "-2", "-3". Empty → "mode". */
  export function modeIdFrom(name: string, taken: readonly string[]): string;
  export function newType(id: string): FixtureType;                       // name "New type", manufacturer "", source custom, one mode "Default" (id "default") with no channels
  export function duplicateType(type: FixtureType, id: string): FixtureType; // source custom, name "<name> copy", modes and their ids kept
  // paste.ts
  export function guessRole(name: string): Role;
  export function parseChannelList(text: string): Channel[];
  // rows.ts
  export type CatalogIndexEntry = { id: string; key: string; name: string; manufacturer: string;
    modes: { name: string; channelCount: number }[]; conversion: { grade: "clean" | "simplified"; reasons: string[] } };
  export type TypeListItem = { id: string; name: string; manufacturer: string; source: "custom" | "ofl"; oflKey?: string;
    modes: { id: string; name: string; channelCount: number }[] };
  export type LibraryRow = { id: string; name: string; manufacturer: string; modes: number[] /* channel counts */;
    source: "mine" | "bundled"; conversion: "clean" | "simplified" | null; reasons: string[]; usedIn: { venue: string; fixtures: number }[] };
  export type LibraryFilter = "all" | "mine" | "bundled";
  /** Mine first, then bundled by maker and name; a catalogue entry whose id is among `mine` appears once, as mine (keeping its conversion). */
  export function libraryRows(mine: readonly TypeListItem[], catalog: readonly CatalogIndexEntry[], uses: ReadonlyMap<string, { venue: string; fixtures: number }[]>): LibraryRow[];
  /** Every typed word must match the maker or the name (case- and accent-insensitive); a word-prefix match ranks before a substring match; mine before bundled at equal rank. */
  export function searchRows(rows: readonly LibraryRow[], query: string, filter: LibraryFilter): LibraryRow[];
  export function counts(rows: readonly LibraryRow[]): { all: number; mine: number; bundled: number };
  ```
- Rules the tests pin: `channelCount` always equals the channel list's length after any edit; a mode's `id` is set by `addMode`/`duplicateMode` from its name through `modeIdFrom` and never changes on `renameMode`; `removeMode` is refused for the last mode; `moveChannel`, `removeChannel` and `duplicateChannel` keep every `fineOf` pointing at the same channel as before (Review Focus 1), and removing a coarse channel clears its fine bytes' `fineOf`; `setChannel` with `fineOf` equal to its own index is refused; `default` outside 0–255 is refused; `addChannel` appends `{ name: "Channel <n>", role: "generic", default: 0 }`; every field the edits do not touch (`physical`, `source`, a channel's `ranges`) is the same object after the edit, and key order is kept.
- `parseChannelList` (Review Focus 3): one channel per non-blank line; a leading channel number with optional `CH`/`Ch.`/`#`, and `:`, `-`, `–`, `.` or tab separators, is stripped; a trailing parenthesis `(0-255)` is stripped; a first line with no digit-led siblings that reads like a header (`Channel`, `Function`, `Ch Function`) is dropped; a name ending in `fine` (or `16bit`, `LSB`) becomes the fine byte of the nearest earlier channel with the same base name; anything unreadable keeps the trimmed line as its name with role `generic`. `guessRole` is a keyword table (dimmer/intensity/master → intensity; red/r, green/g, blue/b, white/w, amber/a, uv → colours; strobe → strobe; shutter → shutter; pan, tilt, zoom, focus, iris, gobo, prism, speed, macro/program/mode/function → macro, effect/fx/sound → effect; colour/color wheel or colour/color macro → macro), longest keyword first, single letters only as a whole name.

- [ ] **Step 1: Failing tests**, one per rule above and per interface (`draft.test.ts`); `paste.test.ts` as a table of at least ten real-shaped excerpts with their expected channels (including the messy ones of Review Focus 3 and `Pan / Pan fine / Tilt / Tilt fine`); `rows.test.ts` (an imported entry listed once as mine with its conversion; ranking; counts; accent-insensitive search); `roundtrip.test.ts`: for each of the eight types in `fixtures/library/types/`, `setChannel` on one channel's name changes only that name (`toEqual` on the clone, and `Object.keys` order kept at type, mode and channel level).
- [ ] **Step 2: Run** — `pnpm -F @ptah-app/ds test -- library/model`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Gates** — `pnpm -F @ptah-app/ds test && pnpm -F @ptah-app/ds typecheck && pnpm -F @ptah-app/ds build` (then `grep -l "node:fs\|node:path" packages/ds/dist/*.js` prints nothing); `pnpm check && pnpm format`.
- [ ] **Step 5: Commit** — `feat(ds): the Library's type draft, channel-list paste and search`.

---

### Task 7: The Library list page

**Files:**
- Create: `packages/ds/src/library/{index.ts,types.ts,LibraryList.tsx,Library.module.css,Library.stories.tsx,sample.ts}`, `packages/ds/src/library/__tests__/list.test.tsx`
- Modify: `packages/ds/package.json` (export `./library`), `packages/ds/vite.config.ts` (entry), `packages/ds/tsconfig.build.json` (include `src/library/index.ts`), `packages/ds/scripts/test-visual.mjs` (boards), `docs/design-system.md`

**Interfaces:**
- Consumes: Task 6's `LibraryRow`, `LibraryFilter`, `searchRows`, `counts`; the ds `Table` (virtualised), `TextField`, `Tabs` or a segmented control, `Menu`, `Dialog`, `Button`.
- Produces (`types.ts`):
  ```ts
  export type LibraryListModel = { rows: LibraryRow[]; query: string; filter: LibraryFilter;
    ofl: { date: string } | null; busyId: string | null /* a row being imported or deleted */; fault: string | null };
  export type LibraryListHandlers = { onQuery(q: string): void; onFilter(f: LibraryFilter): void; onOpen(id: string): void;
    onNew(): void; onImport(id: string): void; onDuplicate(id: string): void; onDelete(id: string): void; onLicence(): void };
  export function LibraryList(props: { m: LibraryListModel; on: LibraryListHandlers; width: number }): JSX.Element;
  ```
- Behaviour: §5.1. The component filters `m.rows` with `searchRows(m.rows, m.query, m.filter)` and shows `counts` on the filter. Row actions by source (`mine` → `Edit`, `Duplicate`, `Delete`; `bundled` → `Import`, `Duplicate`); `Delete` asks first and, when `usedIn` is not empty, is disabled with the venues as its tooltip. `simplified` in `--warn` with the reasons as its tooltip. The footer line `Bundled from Open Fixture Library, <date>, MIT licence`. An empty result holds the table's place (`No type matches`). Below 900 px: the read-only list of §5.4 (name, maker, modes; no actions but open).

- [ ] **Step 1: Failing tests** (`list.test.tsx`): typing filters as typed and raises `onQuery`; the filter shows the three counts; a mine row offers Edit/Duplicate/Delete and a bundled row Import/Duplicate; Delete on a used type is disabled and names the venue; Enter on a focused row opens it; a simplified row shows its reasons; an imported entry appears once; the footer shows the date; below 900 px there is no action control.
- [ ] **Step 2: Run** — `pnpm -F @ptah-app/ds test -- library/__tests__/list`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Stories and boards** at 1280: `ListAll`, `ListSearch` (the mockup's "par 64 rgbw"), `ListMine`, `ListEmptyResult`, `ListPhone` (390), `ListStage`; a `noShift` play typing a query down to no result and back. New baselines with `update:visual --only library-list` (run the node script directly; pnpm's `--` does not pass through).
- [ ] **Step 5: Gates** — `pnpm -F @ptah-app/ds test && pnpm -F @ptah-app/ds typecheck && pnpm -F @ptah-app/ds build`; Storybook for the `library` stories; `node packages/ds/scripts/test-visual.mjs --only library-list`; `pnpm check && pnpm format`.
- [ ] **Step 6: Commit** — `feat(ds): the Library list`.

---

### Task 8: The type page: header, modes and the channel table

**Files:**
- Create: `packages/ds/src/library/{TypePage.tsx,TypeHeader.tsx,ModeTabs.tsx,ChannelTable.tsx,RangesDialog.tsx,TypePage.module.css,Type.stories.tsx}`, `packages/ds/src/library/__tests__/type.test.tsx`
- Modify: `packages/ds/src/library/{index.ts,types.ts,sample.ts}`, `packages/ds/scripts/test-visual.mjs`

**Interfaces:**
- Consumes: Task 6's draft model; the ds `cells` used by the Venue tables (`packages/ds/src/venue/cells.tsx`: move what both screens share to `packages/ds/src/components/_shared/` rather than import across screens), `Select`, `Combobox`, `NumberField`, `Dialog`, `Tabs`, `Menu`.
- Produces (`types.ts`):
  ```ts
  export type TypePageMode = "edit" | "bundled";               // bundled = read-only, with Import
  export type TypePageModel = { mode: TypePageMode; draft: TypeDraft; issues: Issue[]; modeId: string;
    conversion: { grade: "clean" | "simplified"; reasons: string[] } | null;
    usedIn: { venue: string; fixtures: number }[]; saving: boolean; fault: string | null;
    warning: ImpactView | null /* Task 9 */; conflict: boolean };
  export type TypePageHandlers = { onEdit(e: TypeEdit): void; onUndo(): void; onRedo(): void; onMode(modeId: string): void;
    onSave(): void; onImport(): void; onDuplicate(): void; onBack(): void;
    onSaveAnyway(): void; onCancelWarning(): void; onReload(): void; onOverwrite(): void };
  export function TypePage(props: { m: TypePageModel; on: TypePageHandlers; width: number }): JSX.Element;
  ```
- Behaviour: §5.2 except the paste box, the conversion line, the in-use warning and the conflict dialog (Task 9 adds them; this task leaves their mount points and renders nothing there). `← Library`; name and maker edited in place (commit on blur/Enter, Escape reverts, an empty name reverts); mode tabs with an editable name, `+ Add mode`, duplicate and remove in the tab's menu (remove disabled for the last mode); the channel table: position, name, role (27 roles grouped: Intensity; Colour; Position; Beam; Shutter and strobe; Wheels and effects; Generic), fine of (the mode's other non-fine channels, or none), default, inverted, a ranges summary (`0–9 Open · 10–255 Strobe slow→fast`, or `—`) that opens `RangesDialog`, and row actions (move up, move down, duplicate, delete). Reorder by keyboard (Alt+↑/↓ on a focused row) and by drag. Issues mark the cells they name (`/modes/{m}/channels/{c}/fineOf`, …) in fault colour and the header shows the fault count box as the Venue header does. Save disabled when clean, saving, or blocked. In `bundled` mode every control is read-only and Save is replaced by `Import`.
- `RangesDialog`: rows of from, to, meaning; add, delete; it raises one `setRanges` on Done; overlapping or reversed rows are marked as typed and Done stays enabled (the page's issues block Save, not the dialog).

- [ ] **Step 1: Failing tests** (`type.test.tsx`): a name commits one `setName` on blur and reverts when emptied; choosing a role raises `setChannel` with it; "fine of" lists only the mode's other coarse channels; Alt+↓ raises `moveChannel` and focus stays on the moved row; renaming a mode raises `renameMode` and never an id change; remove is disabled on the last mode; a `fine-of-self` issue marks that cell; Save is disabled when clean, saving or blocked, with the first error as its tooltip; bundled mode has no editable control and shows `Import`; the ranges summary reads as above and the dialog raises one `setRanges`; below 900 px the page is text only.
- [ ] **Step 2: Run** — `pnpm -F @ptah-app/ds test -- library/__tests__/type`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Stories and boards**: `TypeEdit` (the mockup's par, 6 ch mode), `TypeErrors`, `TypeBundled`, `TypeRanges` (dialog open), `TypeEmptyMode`, `TypePhone`, `TypeStage`; `noShift` plays for typing a default into error and for moving a row. Baselines with `--only library-type`.
- [ ] **Step 5: Gates** — as Task 7 with `--only library-type`; also `node packages/ds/scripts/test-visual.mjs --only venue-rig` (the shared cells moved).
- [ ] **Step 6: Commit** — `feat(ds): the type page's header, modes and channel table`.

---

### Task 9: The type page: paste, conversion line, in-use warning, conflict

**Files:**
- Create: `packages/ds/src/library/{PasteBox.tsx,ImpactDialog.tsx}`, `packages/ds/src/library/__tests__/{paste.test.tsx,impact.test.tsx}`
- Modify: `packages/ds/src/library/{TypePage.tsx,types.ts,Type.stories.tsx,sample.ts,index.ts}`, `packages/ds/scripts/test-visual.mjs`

**Interfaces:**
- Consumes: Task 6 `parseChannelList`; Task 8's page and types.
- Produces (`types.ts`):
  ```ts
  export type ImpactView = { blocked: boolean; inUseNow: boolean /* the venue the engine runs is affected and a show is loaded */;
    venues: { name: string; fixtures: { name: string; before: number; after: number; overflow: boolean; overlaps: string[] }[];
              lost: { show: string; group: string }[] }[];
    removedModes: { mode: string; venues: string[] }[]; unreadable: string[] };
  export function impactView(impact: unknown /* the server's Impact JSON */, inUseVenueId: string | null, showLoaded: boolean): ImpactView;
  ```
- Behaviour:
  - **Paste box** (§5.2): a textarea labelled `Paste a channel list` under the table with a `Fill the table` button; on press, `parseChannelList`; when the mode already has channels a confirm (`Replace this mode's <n> channels?`); it raises one `replaceChannels`; the textarea then empties. Hidden in bundled mode.
  - **Conversion line** under the header for a type with `conversion`: `clean` in dim text, or `simplified: <reasons joined with "; ">` in `--warn`. Its box is always there for such a type.
  - **Impact dialog** from `m.warning`: per venue, each fixture as `<name>: <before> → <after> ch`, then `overlaps <names>` in warn or `passes channel 512` in fault; lost capabilities as `<show> · <group> loses a capability it needs`; removed modes; unreadable venue files. Not blocked → `Save anyway` / `Cancel`, plus, when `inUseNow`, the line `The running show changes at its next reload.` Blocked → the title `These fixtures must move first`, only `Close` (raising `onCancelWarning`), no `Save anyway`.
  - **Conflict** from `m.conflict`: `This type changed on disk` with `Reload` / `Overwrite`.

- [ ] **Step 1: Failing tests**: pasting into an empty mode raises one `replaceChannels` with the parsed channels and empties the box; into a filled mode it asks first and Cancel raises nothing; the box is absent in bundled mode; the conversion line shows both grades; the dialog lists a growing fixture with its overlap, shows `Save anyway` when not blocked and only `Close` when blocked; `inUseNow` adds its line; `impactView` maps the server JSON of Task 5 (a literal fixture in the test) and tolerates missing arrays; the conflict dialog raises `onReload` / `onOverwrite`; focus returns to Save after Cancel.
- [ ] **Step 2: Run** — `pnpm -F @ptah-app/ds test -- library/__tests__/paste library/__tests__/impact`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Stories and boards**: `TypePaste`, `TypeSimplified`, `TypeWarning`, `TypeBlocked`, `TypeConflict`; a `noShift` play for filling the table from a paste. Baselines with `--only library-type`.
- [ ] **Step 5: Full ds checkpoint** — `pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/ds test && pnpm -F @ptah-app/ds typecheck && pnpm -F @ptah-app/ds test:storybook && pnpm -F @ptah-app/ds test:visual`; the `node:` grep prints nothing; `pnpm -F @ptah-app/web typecheck`; `pnpm check && pnpm format`.
- [ ] **Step 6: Commit** — `feat(ds): the type page's paste box, conversion line, in-use warning and conflict`.

---

### Task 10: The Library in the app: routes and the list

**Files:**
- Create: `apps/web/src/library/{LibraryPage.tsx,useLibrary.ts}`, `apps/web/src/__tests__/library.test.tsx`
- Modify: `apps/web/src/routes.ts` (`library: "/library"` after venue; `libraryRoute(path)`, `libraryPath(id?)`; `shipped` gains it; `screenOf`), `apps/web/src/App.tsx`, `apps/web/src/api/types.ts`, `docs/app.md`

**Interfaces:**
- Consumes: Task 4's routes; Task 5's `GET /types/{id}/uses` and `DELETE`; Task 7's `LibraryList`; Task 6's `libraryRows`, `duplicateType`, `newType`, `newId`.
- Produces: `libraryRoute(path): { id: string | null } | null`; `libraryPath(id?: string): string`; `useLibrary()` reading `GET /types`, `GET /library/catalog` and the uses, with the read-failure pattern of `apps/web/src/venue/useVenue.ts` (`useRead`: a fault with Retry, never an empty list).
- Behaviour: `/library` shows the list; the query and filter live in the URL's search params (`?q=…&f=mine`) so Back returns to the same result. `Import` posts and stays on the list (the row turns `mine`); `Duplicate` of a mine type PUTs `duplicateType(type, newId())` and opens it; of a bundled entry it reads the entry, PUTs its duplicate (custom source) and opens it; `New type` navigates to `/library/new` (Task 11 creates on first Save); `Delete` asks, then DELETEs; a 409 shows `type in use` with the venues. The uses are read once per type list (one request per mine type is acceptable for tens of types; a failed uses read shows `—` and a fault line, never "unused").

- [ ] **Step 1: Failing tests** (`fetch` mocked as in `venue.test.tsx`): `/library` renders mine first and the catalogue; `?q=par&f=bundled` restores the search; Import posts once and the row becomes mine without a navigation; Duplicate of a bundled entry PUTs a custom-source type under a new id and navigates to it; Delete refused with 409 keeps the row and says `type in use`; a failed catalogue read shows a fault with Retry and still lists mine; the strip shows Library after Venue.
- [ ] **Step 2: Run** — `pnpm -F @ptah-app/web test -- library`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Gates** — `pnpm -F @ptah-app/ds build && pnpm -F @ptah-app/web test && pnpm -F @ptah-app/web typecheck && pnpm -F @ptah-app/web build`; `pnpm check && pnpm format`.
- [ ] **Step 5: Commit** — `feat(web): the Library list page`.

---

### Task 11: The type page in the app: the save flow

**Files:**
- Create: `apps/web/src/library/{TypeEditor.tsx,useType.ts,saveType.ts}`, `apps/web/src/__tests__/type.test.tsx`
- Modify: `apps/web/src/library/LibraryPage.tsx` (route `/library/<id>` and `/library/new`), `docs/app.md`

**Interfaces:**
- Consumes: Task 5's routes; Tasks 8–9's `TypePage`, `impactView`; Task 6's draft model; the Venue page's leave guard and history helpers in `routes.ts` (`setLeaveGuard`, the `history.go` restore), `getWithRevision`, `putJson`, `deleteJson`.
- Produces:
  ```ts
  export type SaveTypeOutcome =
    | { kind: "saved"; revision: string; issues: Issue[] }
    | { kind: "needs-confirm"; impact: unknown }        // changes but not blocked: the page shows the warning
    | { kind: "blocked"; impact: unknown }              // the server would refuse, or refused (409 "type in use")
    | { kind: "conflict"; revision: string }
    | { kind: "invalid"; issues: Issue[] };
  /** `confirmed`: the owner pressed Save anyway. Asks the impact first unless confirmed or the type is new. */
  export async function saveType(api: Api, type: FixtureType, revision: string | null, opts: { isNew: boolean; confirmed: boolean }): Promise<SaveTypeOutcome>;
  ```
- **The state table** (spec §6). One test per row, named after it:

| # | State | Event | Result |
|---|---|---|---|
| 1 | clean | edit | dirty; local checks run |
| 2 | dirty, no errors | Save, type unused | one impact request (no changes) then the PUT; clean |
| 3 | dirty, no errors | Save, used, footprints unchanged | saved; clean; no dialog |
| 4 | dirty, no errors | Save, used, a footprint changes, every venue loadable | the warning opens; nothing written |
| 5 | warning | Save anyway | PUT with `confirmed`; saved; clean |
| 6 | warning | Cancel | dirty; nothing written; focus on Save |
| 7 | dirty | Save, a venue would stop loading | the blocked dialog; nothing written |
| 8 | dirty | Save, 409 `type changed on disk` | conflict dialog; `Reload` re-reads (after a confirm), `Overwrite` PUTs with the 409's revision and goes through rows 2–7 again |
| 9 | dirty | Save, 422 | dirty; the server's issues replace the local ones |
| 10 | dirty | leave, strip navigation, Back, Forward, tab close | asks first; Stay keeps the draft and the history stack |
| 11 | saving | any edit, undo, redo, ⌘S | refused until the answer; nothing natively disabled; focus kept |
| 12 | bundled | Import | POST import; the page becomes editable `mine` at the same URL |
| 13 | bundled | Import, the id already exists | the existing type opens untouched (Review Focus 4) |
| 14 | any | the type no longer exists (404 on read or save) | the page says so and offers the Library |
| 15 | new (`/library/new`) | first Save | PUT under a fresh id; the URL becomes `/library/<id>` with `history.replaceState` |
| 16 | saved elsewhere while open and clean | window focus | the type is read again (revision changed) |
- Behaviour beyond the table: `/library/<id>` resolves a mine type first, else the bundled entry (read-only), else row 14; `usedIn` from `GET /types/{id}/uses`; `inUseNow` from the `state` topic's show info (venue id and `showLoaded`); ⌘S saves, ⌘Z/⇧⌘Z undo/redo (not while a field with its own undo is focused); the page's effects survive React StrictMode (the test file renders under `<StrictMode>` as `main.tsx` does); a late answer after the page left is ignored.

- [ ] **Step 1: Failing tests** — `saveType` against a fake `Api` for outcomes 2–9 (asserting the exact requests: the impact POST's body, the PUT's `If-Match`), then the sixteen rows on the page.
- [ ] **Step 2: Run** — `pnpm -F @ptah-app/web test -- type`. Expected: FAIL.
- [ ] **Step 3: Implement** `saveType.ts` first (pure of React), then the page as thin wiring.
- [ ] **Step 4: Docs** — `docs/app.md`: the Library pages, the save flow, the state table.
- [ ] **Step 5: Gates** — as Task 10.
- [ ] **Step 6: Commit** — `feat(web): the type page, with the in-use warning and conflict handling`.

---

### Task 12: The Venue type picker searches the bundled library

**Files:**
- Modify: `packages/ds/src/venue/{FixturesTable.tsx,AddFixturesDialog.tsx,types.ts,sample.ts}` and their tests and stories, `apps/web/src/venue/{useVenue.ts,VenuePage.tsx}`, `apps/web/src/__tests__/venue.test.tsx`, `docs/app.md`

**Interfaces:**
- Consumes: Task 4's catalogue index and import; Task 6's `searchRows`; Task 10's `libraryPath`.
- Produces (`packages/ds/src/venue/types.ts`): `VenueModel` gains `bundled: { id: string; name: string; manufacturer: string; simplified: string[] | null }[]`; `VenueHandlers` gains `onPickBundled(entryId: string, then: (typeId: string) => void): void`, `onNewType(): void`, `onOpenLibrary(): void`.
- Behaviour (§5.3, §5.2 last bullet): the type picker in the fixtures table and in Add fixtures lists the owner's types first, then bundled entries marked `bundled` (filtered as typed; the list shows at most 50 bundled matches and `… more: keep typing`). Picking a bundled entry calls `onPickBundled`; the page imports it (`POST …/import`), adds the type to its types, and only then applies the pick; a simplified entry's reasons are shown once as a toast in warn colour. The line `Type missing? Types are added in the next version.` is replaced by two picker foot entries, `New type…` and `Open the Library`, which navigate through the Venue page's unsaved-changes guard. The Venue page re-reads the types when the window regains focus and before each Save (so a type saved in the Library is never judged against a stale copy); a failed re-read before Save stops the save with a fault line.

- [ ] **Step 1: Failing tests**: the picker lists mine before bundled and filters both; picking a bundled entry imports once, then raises `setFixture` with the imported type and its first mode; a failed import leaves the fixture unchanged and says so; the foot entries exist and the old line is gone; `Open the Library` with unsaved changes asks first; the types are fetched again on `focus` and before Save; a Save after a type changed in the Library uses the fresh type (no stale 422).
- [ ] **Step 2: Run** — `pnpm -F @ptah-app/ds test -- venue && pnpm -F @ptah-app/web test -- venue`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Gates** — `pnpm -F @ptah-app/ds test && pnpm -F @ptah-app/ds typecheck && pnpm -F @ptah-app/ds build`; Storybook for the venue stories; `node packages/ds/scripts/test-visual.mjs --only venue-rig` (re-baseline only the boards whose picker changed, named in the commit); web test, typecheck, build; `pnpm check && pnpm format`.
- [ ] **Step 5: Commit** — `feat(web): the Venue type picker finds and imports bundled types`.

---

### Task 13: End to end, docs, the owner check

**Files:**
- Create: `apps/web/e2e/library.spec.ts`, `docs/ledgers/fixture-types-owner-check.md`
- Modify: `apps/web/e2e/engine.ts` only if a helper is missing, `docs/design-system.md`, `docs/library.md`, `README.md` (one line on the Library and the catalogue)

**Interfaces:**
- Consumes: everything; the real `ptah` binary on a temp root, as `venue.spec.ts`.

- [ ] **Step 1: Write the e2e tests.**

```ts
test("a bundled par is found, imported and used in a venue", …)
// /library?q=<a par in the catalogue> → Import → the row is mine; in the Venue page Add fixtures with that type → Save → GET /venues/<id> has fixtures of that type id
test("a type made from a pasted channel list is used in a venue", …)
// New type → name it → paste "1 Dimmer\n2 Red\n3 Green\n4 Blue\n5 Strobe" → Fill the table → roles read intensity/red/green/blue/strobe → Save → usable in the Venue picker
test("growing a used type warns with the overlap and Cancel writes nothing", …)
// two fixtures of one type side by side; add a channel → Save → the dialog names the second fixture as overlapped → Cancel → the type file's bytes are unchanged
test("a save that would push a fixture past 512 is refused", …)        // a fixture at 510; grow the mode → the blocked dialog, GET /venues still lists the venue
test("the Venue picker imports a bundled type in place", …)
test("a pixel bar says it is simplified and lights as one", …)
// open the entry: its line reads "simplified: <N> pixels act as one light"; import, patch it on an Art-Net universe, trigger a colour: every pixel's bytes carry the same colour on the wire
test("the phone width shows the Library read-only", …)
```

- [ ] **Step 2: Run** — `cargo build -p ptah && pnpm -F @ptah-app/web test:e2e -- library`. A product bug found here gets a failing unit or integration test in its owning layer first, then the fix, in its own commit.
- [ ] **Step 3: `docs/ledgers/fixture-types-owner-check.md`**: the five exit checks of §9 as steps the owner can follow at the rig (exact clicks, what to look at, what pass means), the rebuild line (`pnpm -r build && cargo build --release -p ptah`), and a list of the entries graded simplified among the lights the owner is likely to meet.
- [ ] **Step 4: Docs** — `docs/design-system.md` (the `library` entry and its stories), `docs/library.md` (the screens), `README.md`.
- [ ] **Step 5: The whole gate** — `pnpm allcheck`. Expected: PASS.
- [ ] **Step 6: Commit** — `test(web): the Library end to end against the real binary` and `docs: fixture types owner check and Library notes`.
