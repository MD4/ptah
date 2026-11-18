# Measured Reaper Offset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Reaper offset advice on Settings uses what the rig measured (note in → frame out, frame out → send starts, the write to the Enttec) in place of fixed guesses, line by line, and says which lines are measured.

**Architecture:** The pure advice function in `ptah-model` takes optional measures and swaps terms; the server reads the measures from the engine's telemetry timers (`run` medians); the Settings block words each term and its status and re-reads every 10 s.

**Tech Stack:** Rust 1.93 (no new crate), React 19 + the ds, Vitest, Storybook gates, Playwright 1.59.1, Biome, cargo-nextest 0.9.150.

**Spec:** `docs/superpowers/specs/2026-11-18-v2-measured-offset-design.md` (V1 repo). Executors read it first.

## Global Constraints

- Repo `~/projects/ptah-v2`, branch `measured-offset` from `master` (767b4cf or later). V1 (`~/projects/ptah`) is never modified except this plan and its spec.
- Never start V1 services or pm2; never touch or read `~/.ptah` or `~/ptah-home`; tests use temp roots and free ports; the owner's Storybook servers on 6006–6008 stay up; no outward pushes; never kill a `ptah` you did not start.
- `AGENTS.md` (disk): no extra git worktree, no second `target/`; never `cargo clean` unless `du -sh target` is above 30 GB; `df -h /System/Volumes/Data | tail -1` before a full workspace build.
- No new dependency. The render thread does not change (the timers exist).
- Biome only; tokens-only styling; nothing shifts (the lines of a universe are fixed for its output kind; figures change in place); calm (no loud word in this block for a measure).
- Exact copy:
  - status line under the number: `measured on this rig over <n> notes since PTAH started`; `partly measured: <n> of 50 notes`; `partly measured`; `estimated: play a song to measure (<n> of 50 notes)`.
  - term words: `Note in → frame out` (measured engine line; estimated it stays `Waiting for the next frame (<r> Hz)`), `Frame out → send starts` (measured; estimated `Waiting for the next send (<r> Hz)`), `Writing to the Enttec`, and the existing `Enttec USB Pro, one full frame` / `Art-Net node, one frame` / `sACN node, one frame`, `Fixtures (LED)` / `(halogen)` / `(discharge)`.
  - each term line ends with `measured` or `estimated`.
- Exact values: median (`p50`) of the `run` quantiles; 50 notes for the engine line, 200 samples for each output line; a draft `renderRateHz` different from the running rate keeps the engine line estimated; refresh every 10 s while the page is visible; a stored-versus-advised difference under 5 ms counts as the same.
- Conventions: failing test first with the RED output in the report; at most three agents at once; a UI task runs the visual gate for its boards and Storybook for its stories; `pnpm allcheck` in the last task. Conventional Commits with scopes.

## Review Focus

1. A fresh start: no sample yet, or a few. → Task 1 `below_the_sample_floor_the_estimate_stands`, Task 3 status-line tests.
2. A venue with two universes of different outputs (USB Pro + Art-Net), one measured and one not. → Task 1 `level_is_partly_when_only_some_lines_are_measured`.
3. The page asks for a draft frames-per-second. → Task 1 `a_draft_rate_keeps_the_engine_line_estimated`.
4. The number moving by a millisecond between refreshes must not make the stored value read as different, nor shift the block. → Task 3 `under_5_ms_counts_as_the_same`, the no-shift story.
5. An engine with `--fake-io` or a replay (no real timers for outputs). → Task 2 `fake_outputs_measure_nothing_they_do_not_send`.

## File structure

```
crates/ptah-model/src/offset_advice.rs     Measures, the swap, level, notes
crates/ptah-server/src/http/               the advice route reads the timers
packages/ds/src/settings/OffsetAdvice.tsx  words, status line, per-term status; types.ts, sample.ts, stories
apps/web/src/settings/SettingsPage.tsx     10 s refresh; tolerance
apps/web/e2e/settings.spec.ts
```

---

### Task 1: The advice takes measures (model, pure)

**Files:**
- Modify: `crates/ptah-model/src/offset_advice.rs`, its tests, `docs/schemas.md` if the advice is described there
- Callers of `offset_advice` (the server) pass `None` in this task.

**Interfaces:**
- Produces:
  ```rust
  #[derive(Debug, Clone, Copy, PartialEq)] pub struct Measure { pub ms: f64, pub samples: u64 }
  #[derive(Debug, Clone, PartialEq, Default)]
  pub struct Measures { pub running_rate_hz: f64, pub engine: Option<Measure>,
      pub send: Vec<(u32, Measure)>, pub write: Vec<(u32, Measure)> }   // by universe number
  pub const NOTES_NEEDED: u64 = 50; pub const FRAMES_NEEDED: u64 = 200;
  pub fn offset_advice(venue, types, render_rate_hz, default_output_rate_hz, measures: Option<&Measures>) -> OffsetAdvice;
  // Term gains `pub measured: bool`; `what` gains "engine", "send", "write".
  // OffsetAdvice gains `pub notes: u64`, `pub notes_needed: u64`; `level`: "measured" | "partly" | "estimated".
  ```
- Rules (spec "What is measured"): `engine` replaces `frame-wait` when `samples ≥ NOTES_NEEDED` and `render_rate_hz == running_rate_hz`; `send` replaces `output-wait` when `samples ≥ FRAMES_NEEDED`; a USB Pro universe always has a `write` term (measured ms when `samples ≥ FRAMES_NEEDED`, else 0 and `measured: false`); `output` and `fixtures` are never measured. Totals and `offset_ms` follow the terms. With `None` the JSON is today's plus `measured: false` on each term, `notes: 0`, `notesNeeded: 50` (and the USB Pro `write` 0 term).

- [ ] **Step 1: Failing tests:** `below_the_sample_floor_the_estimate_stands`; `each_line_swaps_at_its_floor` (49/50 notes, 199/200 frames); `a_draft_rate_keeps_the_engine_line_estimated`; `a_usbpro_universe_has_a_write_line_an_artnet_one_does_not`; `level_is_measured_partly_or_estimated`; `level_is_partly_when_only_some_lines_are_measured` (two universes); `totals_and_the_offset_follow_the_swapped_terms`; `without_measures_the_figures_are_todays` (existing expectations still hold).
- [ ] **Step 2:** `cargo nextest run -p ptah-model offset` → FAIL. **Step 3: Implement. Step 4:** `cargo nextest run -p ptah-model` and `cargo check -p ptah-server --all-targets` → PASS.
- [ ] **Step 5: Commit** `feat(model): the offset advice takes the rig's measures`.

### Task 2: The server passes the timers (server)

**Files:**
- Modify: the `/offset-advice` route in `crates/ptah-server/src/http/`, `crates/ptah-server/tests/settings.rs`, `docs/api.md`

**Interfaces:**
- Consumes Task 1; the engine's telemetry snapshot (`TimersSnapshot`: `end_to_end`, `publish_to_sent`, `sent_to_written`, each `.run` `{ p50, count }` in ns) and the running render rate.
- Produces: `GET /offset-advice` answers with the measures of the running engine; a universe whose output worker sends nothing (fake outputs, a replay, `none`) has no measure.

- [ ] **Step 1: Failing tests:** `the_advice_is_measured_after_fifty_notes` (the fake engine IO plays notes; the engine line reads `what: "engine"`, `measured: true`, `notes ≥ 50`); `before_any_note_it_is_estimated_with_notes_0`; `fake_outputs_measure_nothing_they_do_not_send`; the existing advice tests updated for the new fields only.
- [ ] **Step 2:** → FAIL. **Step 3: Implement. Step 4:** `cargo nextest run -p ptah-server`, `cargo clippy --workspace --all-targets` → PASS.
- [ ] **Step 5: Commit** `feat(server): the offset advice reads the engine's timers`.

### Task 3: The Settings block says what is measured (ds)

**Files:**
- Modify: `packages/ds/src/settings/{OffsetAdvice.tsx,types.ts,sample.ts,screenSample.ts,Sections.stories.tsx,Sections.module.css}`, `packages/ds/src/settings/__tests__/sections.test.tsx`, `docs/design-system.md`
- A shared part of Settings → full visual gate.

**Interfaces:**
- Consumes the wire of Task 1 (`AdviceTerm.measured`, `what` values, `Advice.notes`, `notesNeeded`, `level`).
- Produces: the status line, the per-term words and status; `sameOffset(storedMs, offsetMs): boolean` (difference under 5 ms) exported from the settings model and used wherever the block compares the stored and the advised number.

- [ ] **Step 1: Failing tests:** the four status lines, word for word; each term's words in both states; every term line ends with `measured` or `estimated`; `under_5_ms_counts_as_the_same` (4 same, 5 different, null handling as today); the block's box is equal between an estimated and a measured advice of the same venue.
- [ ] **Step 2:** → FAIL. **Step 3: Implement.**
- [ ] **Step 4:** stories `Settings/Sections/{Offset measured, Offset partly, Offset estimated}` with a no-shift play swapping the three; boards for them; ds tests, Storybook for the Settings stories, **full** visual gate (existing Settings boards re-recorded only where the new status words appear; say which).
- [ ] **Step 5: Commit** `feat(ds): the Reaper offset says what is measured`.

### Task 4: The page refreshes; end to end; docs; full gate (web)

**Files:**
- Modify: `apps/web/src/settings/SettingsPage.tsx`, `apps/web/src/api/types.ts`, `apps/web/src/settings/__tests__/page.test.tsx`, `apps/web/e2e/settings.spec.ts`, `docs/app.md`, `docs/ledgers/settings-owner-check.md` (one added check: play a song, read `measured`, compare with what Reaper is set to)

**Interfaces:**
- Consumes Tasks 2, 3. The page asks `/offset-advice` again every 10 s while visible (not while a store is in flight, not while hidden), beside its existing asks; a failed refresh keeps what is shown and toasts nothing.

- [ ] **Step 1: Failing tests:** `the_offset_is_asked_again_every_10_s_while_visible` (fake timers; none while hidden; none during a store); `a_failed_refresh_keeps_the_block_and_is_silent`; `a_refresh_that_moves_the_number_by_2_ms_keeps_the_stored_value_as_matching`.
- [ ] **Step 2:** → FAIL. **Step 3: Implement. Step 4:** `pnpm -F @ptah-app/web test` → PASS; build, typecheck, Biome.
- [ ] **Step 5: e2e** (`settings.spec.ts`, the Monitor spec's real-MIDI rig): `after a song the offset reads measured` (play 60 notes; poll the block until the status line says `measured on this rig over`); → `pnpm -F @ptah-app/web test:e2e -- settings` PASS.
- [ ] **Step 6: Full gate:** `df -h /System/Volumes/Data | tail -1`, `pnpm allcheck` → exit 0 (a test that times out under the parallel load and passes alone is re-run once and reported); `du -sh target`.
- [ ] **Step 7: Commit** `feat(web): the Reaper offset refreshes as the rig measures` and `docs: the measured Reaper offset`.
