# Packaging 1 of 2: the installable `ptah` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ptah` something that is released, installed with one line, keeps the machine awake, seeds a demo into a new folder, and updates itself when asked, for Mac and Linux.

**Architecture:** Everything here lives in the existing `ptah` command (`crates/ptah`) and its server (`crates/ptah-server`), plus a release workflow and an install script. The engine's render process is not touched. The update mechanism, the keep-awake request and the demo seeding sit in `ptah` itself so both doors use them: the command line now, the app window in plan 2.

**Tech Stack:** Rust 1.93 (clap, reqwest blocking, serde), GitHub Actions, POSIX shell, TypeScript and React for the two Settings lines.

**Spec:** `~/projects/ptah/docs/superpowers/specs/2026-11-23-v2-packaging-design.md` (approved 2026-11-23). Code: `~/projects/ptah-v2`, branch `packaging-command` from `master`.

## The series

| Plan | Delivers | Depends on |
|---|---|---|
| **1 The installable `ptah`** (this one) | versions, releases, the one-line install of the command, updates, keep-awake, the demo, a fresh install local only, the history report for going public | the redesign merged (it changes Settings) |
| 2 The app | the Tauri window around `ptah`, joining a running one, the quit question, WebKit tests, the app in the release and the installer, the disk image, the guide | 1 |

Each plan ends with the app working and `pnpm allcheck` green.

## Global Constraints

- The engine's render process gains nothing: no window, packaging, network or update code in `ptah-engine`, `ptah-vm`, `ptah-clock`.
- No cost for the owner: nothing here needs a paid account or certificate. The app and the command are not signed with an Apple Developer identity.
- No new dependency younger than 14 days; every dependency pinned exactly.
- Nothing updates, and no update is offered, while a show is loaded. "A show is loaded" means the engine's state has a show (`showInfo` is set).
- An update never leaves a machine without a working `ptah`: on any failure the old one stays.
- A new root folder serves this machine only; an existing root keeps its settings.
- Never touch the owner's `~/.ptah` or `~/ptah-home`. Every test uses a temporary root and `PTAH_RELEASES_URL` (below), never the real Releases page.
- Never start V1 services or pm2; leave the untracked `docs/design/brief/` and `.ignore` alone; the Storybook servers on 6006–6008 stay up; no push, no tag, no release and no change to the repository's visibility or secrets unless the owner asks: those are the owner's actions, listed at the end.
- Disk (AGENTS.md): `df -h /System/Volumes/Data | tail -1` before a heavy build; below 30 GB free, clean first and tell the owner. No extra worktree. `--release` builds only where a task says so.
- At most three agents at once. Biome only for TypeScript; `cargo fmt` and `clippy -D warnings` for Rust.
- New words on screen are the ones this plan lists.

## Decisions this plan makes

- **Version.** The workspace version becomes `2.0.0`; `ptah --version`, `GET /api/v1/server` and the update check all read it. Releases are tags `v2.x.y`.
- **A release's files**, one set per target (`aarch64-apple-darwin`, `x86_64-apple-darwin`, `x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu`):
  - `ptah-<version>-<target>.tar.gz`, holding one file, `ptah`;
  - `SHA256SUMS`, one line per archive, as `shasum -a 256` prints it;
  - `SHA256SUMS.sig`, the Ed25519 signature of `SHA256SUMS`, base64;
  - `latest.json`: `{ "version": "2.1.0", "notes": "<the changelog section>" }`.
- **Where releases are read from.** `https://github.com/<owner>/ptah-v2/releases/latest/download/` by default, built into `ptah` from one constant; the environment variable `PTAH_RELEASES_URL` replaces it (tests point it at a local folder served over HTTP).
- **The key.** One Ed25519 key pair for the project. The public half is a constant in `ptah`. The private half exists only in the repository's secrets (`PTAH_RELEASE_KEY`) and on the owner's machine. `scripts/release-key.sh` makes the pair once and prints both halves; it writes nothing into the repository.
- **Where `ptah` is installed.** `/usr/local/bin/ptah` if that folder is writable, else `~/.local/bin/ptah`. The installer never asks for a password and never edits a shell profile; if the folder is not on the path it prints the one line to add.
- **Updating swaps one file.** `ptah update` downloads the archive for its own target next to the running `ptah`, checks the signature and the fingerprint, keeps the current file as `ptah.previous`, and renames the new one into place. `ptah update --back` swaps them back. (Plan 2 extends the swap to the whole app.)
- **Keeping awake** uses the system's own tool as a child of the supervisor, started when a show is loaded and stopped when it is not: `caffeinate -dims -w <supervisor pid>` on a Mac; `systemd-inhibit --what=idle:sleep` holding a `sleep infinity` on Linux when it exists, else nothing. No new dependency. The child dies with the supervisor.
- **The demo** is the folder `demo/` in the repository (one show, one venue whose universe has the output "none" and eight fixtures of two bundled-style types, three programs: a dimmer pulse, a colour wash, a chase across the lights). It is built into `ptah` and written into a root that has no show when `ptah` starts.
- **A new root's settings**: `listen` off (this machine only), `uiPort` 8420, "check for updates" on. Where an existing root has no value for a new key, the old behaviour holds.
- **The update check**: at start and at most once every 24 hours, with a 3 s limit, never when "Check for updates" is off, never while a show is loaded. No network is not an error and prints nothing.
- **New words.** Terminal: `ptah: version 2.1.0 is available; ptah update installs it`. `ptah update`: `ptah: a show is loaded; unload it, then update`, `ptah: 2.1.0 installed; start ptah again`, `ptah: already the latest (2.0.0)`, `ptah: the download does not match its signature; nothing changed`, `ptah: back to 2.0.0`. Settings, About panel: "Version 2.0.0", "PTAH 2.1.0 is available", the button "Update", the switch "Check for updates", and while a show is loaded "Unload the show to update".

## Review Focus

1. **The download is cut or tampered with**: a short archive, a wrong fingerprint, a bad signature, a full disk. `ptah` stays as it was and says why. (Task 4)
2. **Two `ptah` at once**: one running while `ptah update` swaps the file. The running one keeps working until it is stopped; the next start is the new one. (Task 4)
3. **A machine with no network, or a slow one, at a gig**: start is not delayed by more than the 3 s limit and nothing is printed. (Task 3)
4. **A root that already has shows** is never given the demo, and its settings file is never rewritten at start. (Task 2)
5. **The supervisor's keep-awake child** never outlives it: after a crash, a kill, or a normal stop, no `caffeinate` remains. (Task 5)

---

### Task 1: The history report for going public

**Files:** Create `docs/going-public.md` (the report). No code changes.

The repository is private and will be made public by the owner before the first release. This task reports; it changes nothing in the history.

- [ ] **Step 1: Scan the whole tracked history** (`git log --all -p`, every branch and tag) for: keys, tokens and passwords (patterns for common providers, `BEGIN … PRIVATE KEY`, long base64 or hex strings near words like key, token, secret); e-mail addresses; home-folder paths with a user name; street addresses and phone numbers; people's and bands' names in fixtures, sample shows, notes and commit messages; third-party material with a licence (the bundled fixture library, fonts) and whether its licence text is present.
- [ ] **Step 2: Write `docs/going-public.md`**: one table per kind of finding with the file, the first and last commit that hold it, and whether it is still in the latest tree; then a short list of choices for each (keep, replace in the latest tree, rewrite history). End with the licence the repository states today (`UNLICENSED` in `Cargo.toml`) and that a public repository needs the owner to choose one.
- [ ] **Step 3: Commit**: `git commit -m "docs: what the history holds, before going public" docs/going-public.md`

### Task 2: The version, a new root, the demo

**Files:**
- Modify: `Cargo.toml` (the workspace version), `crates/ptah/src/cmd/up.rs`, `crates/ptah/src/cmd/supervise.rs` (only where a root is first read), `crates/ptah-server/src/http/server.rs` (the `/server` answer), `crates/ptah-model/src/store/` (a new `seed.rs`), `crates/ptah-model/src/types/settings.rs` and `schemas/settings.schema.json` (the new optional key), `docs/api.md`, `docs/file-layout.md`
- Create: `demo/` (the demo's files), `CHANGELOG.md`
- Test: `crates/ptah-model/tests/seed.rs`, `crates/ptah/tests/cli.rs` (extend), `crates/ptah-server/tests/` (the `/server` test)

**Interfaces:**
- Produces: `ptah_model::store::seed(layout: &Layout) -> Result<Seeded, StoreError>` with `enum Seeded { Nothing, Settings, SettingsAndDemo }`; `Settings.check_for_updates: Option<bool>` (JSON `checkForUpdates`; absent reads as true); `GET /api/v1/server` gains `"root": "<absolute path>"`; `ptah --version` prints `ptah 2.0.0`.

- [ ] **Step 1: Write the failing tests.**

```rust
#[test] fn an_empty_root_gets_settings_and_the_demo() {
    let root = tempdir();
    assert_eq!(seed(&Layout::new(root.path())).unwrap(), Seeded::SettingsAndDemo);
    let s = read_settings(root.path());
    assert_eq!(s["listen"], json!(false));
    assert_eq!(s["uiPort"], json!(8420));
    assert_eq!(list_shows(root.path()).len(), 1);
    assert!(validate_v2_tree(root.path()).iter().all(|f| f.issues.is_empty()));
}
#[test] fn a_root_with_a_show_gets_nothing_and_its_settings_bytes_are_unchanged() { /* Review Focus 4 */ }
#[test] fn a_root_with_settings_but_no_show_gets_the_demo_only() { /* settings bytes unchanged */ }
#[test] fn seeding_twice_changes_nothing_the_second_time() {}
#[test] fn the_demo_has_one_venue_with_output_none_eight_fixtures_and_three_programs() {}
```

  In `cli.rs`: `ptah --version` is `ptah 2.0.0`; bare `ptah` on an empty temporary root ends up serving on 127.0.0.1 only and prints no network warning. In the server test: `/server` holds `root`.
- [ ] **Step 2: Run** `cargo nextest run -p ptah-model -p ptah -p ptah-server` — FAIL.
- [ ] **Step 3: Make the demo.** Start `ptah` on a temporary root, build the demo with the app (or write its files by hand from the fixtures' shapes), run `ptah check --root <it>` until it is clean, and copy the files to `demo/`. `ptah check demo` must pass in CI (add it to `rust:allcheck` in `package.json`).
- [ ] **Step 4: Implement.** `demo/` is built into `ptah-model` with `include_dir` (already a dependency if the web app is embedded that way; else `include_str!` per file). Bare `ptah` and `ptah supervise` call `seed` before anything else reads the root.
- [ ] **Step 5: Run** — PASS. Then `pnpm allcheck` for the Rust half (`pnpm rust:allcheck`).
- [ ] **Step 6: Commit**: `git commit -m "feat: version 2.0.0, a new root is local only and gets the demo" <paths>`

### Task 3: The update check

**Files:**
- Create: `crates/ptah/src/update/mod.rs`, `crates/ptah/src/update/check.rs`
- Modify: `crates/ptah/src/lib.rs`, `crates/ptah/src/cmd/up.rs` (the one line at start), `crates/ptah-server/src/http/` (a new `update.rs` and its route), `docs/api.md`
- Test: `crates/ptah/tests/update.rs`, `crates/ptah-server/tests/update.rs`

**Interfaces:**
- Produces:

```rust
pub struct Latest { pub version: semver_like::Version, pub notes: String }
pub fn releases_url() -> String;                       // PTAH_RELEASES_URL, else the built-in one
pub fn check(root: &Layout, now: SystemTime) -> Check; // reads and writes <root>/update.json
pub enum Check { Off, TooSoon(Option<Latest>), Offline, UpToDate, Newer(Latest) }
```

  `GET /api/v1/update` → `{ "current": "2.0.0", "latest": "2.1.0" | null, "notes": "…" | null, "canUpdate": bool, "why": "show loaded" | "not installed by the installer" | null }`. Versions compare by their three numbers; no new dependency is needed for that.

- [ ] **Step 1: Write the failing tests** against a local HTTP server on a free port serving a temporary folder: a newer `latest.json` gives `Newer`; the same version `UpToDate`; a server that never answers gives `Offline` in under 3.5 s (Review Focus 3); a second check within 24 hours makes no request and returns what the first learned; `checkForUpdates: false` makes no request; garbage in `latest.json` is `Offline`; bare `ptah` prints the one "is available" line once at start and nothing when offline; the API answer for each case, with `canUpdate` false and `why` "show loaded" while a show is loaded.
- [ ] **Step 2: Run** `cargo nextest run -p ptah -p ptah-server update` — FAIL.
- [ ] **Step 3: Implement.** The check runs on its own thread at start and never delays the supervisor.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit**: `git commit -m "feat: ptah checks for a newer version, at most once a day" <paths>`

### Task 4: `ptah update`

**Files:**
- Create: `crates/ptah/src/update/install.rs`, `crates/ptah/src/update/verify.rs`, `crates/ptah/src/cmd/update.rs`
- Modify: `crates/ptah/src/main.rs` and `cmd/mod.rs` (the subcommand), `crates/ptah-server/src/http/update.rs` (`POST /api/v1/update`), `Cargo.toml` (the signature and hash crates, pinned, each at least 14 days old: `ed25519-dalek` and `sha2`, and `flate2` and `tar` if not already present), `docs/api.md`
- Test: `crates/ptah/tests/update.rs` (extend), `crates/ptah/src/update/verify.rs` unit tests

**Interfaces:**
- Consumes: `releases_url`, `Latest` (Task 3).
- Produces: `ptah update [--back] [--root R]`; `pub fn verify(sums: &[u8], sig_b64: &str, archive: &[u8], name: &str, key: &PublicKey) -> Result<(), VerifyError>`; `pub fn install(to: &Path, archive: &[u8]) -> Result<(), InstallError>`; `POST /api/v1/update` → 202 and the swap, or 409 `{ "error": "show-loaded" }`.

| State | Event | Result |
|---|---|---|
| Latest is newer, no show loaded | `ptah update` | The new file in place, the old one as `ptah.previous`, "2.1.0 installed; start ptah again", exit 0 |
| Already the latest | `ptah update` | "already the latest (2.0.0)", exit 0, nothing written |
| A show is loaded in a running `ptah` of this root | `ptah update` | The "show is loaded" line, exit 3, nothing written |
| No network | `ptah update` | One line saying it could not reach the releases, exit 2 |
| Signature or fingerprint wrong, archive cut, no file `ptah` in it | `ptah update` | The "does not match" line, exit 2, nothing changed, no stray file left (Review Focus 1) |
| The folder is not writable, or the disk is full mid-write | `ptah update` | One line with the reason, exit 2, the old `ptah` intact |
| A `ptah` of the old file is running | `ptah update` | The swap succeeds; the running one keeps answering; the next start reports the new version (Review Focus 2) |
| After an update | `ptah update --back` | The two files swap back, "back to 2.0.0" |
| No `ptah.previous` | `ptah update --back` | One line saying there is nothing to go back to, exit 2 |
| `ptah` is running from a build folder (`target/`) or from Homebrew's folder | `ptah update` | Refused: it says how it was installed and what to run instead (`brew upgrade`), exit 3 |

- [ ] **Step 1: Write the failing tests**: one per row, each with a temporary install folder holding a copy of the built `ptah`, a local release folder made by a test helper that signs with a test key, and `PTAH_RELEASES_URL` set. `verify` unit tests: a good set passes; one flipped byte in the archive, in `SHA256SUMS`, and in the signature each fail with their own error; an archive not listed in `SHA256SUMS` fails.
- [ ] **Step 2: Run** `cargo nextest run -p ptah update` — FAIL.
- [ ] **Step 3: Implement.** Download to a temporary file in the install folder; verify; unpack `ptah` beside it; set its mode; rename the current file to `ptah.previous`, then the new one into place (two renames in one folder; if the second fails, rename the first back). The test key and the real key are chosen by a build-time constant that tests override through an environment variable read only in debug builds.
- [ ] **Step 4: Run** — PASS; `cargo clippy --all-targets -- -D warnings`.
- [ ] **Step 5: Commit**: `git commit -m "feat: ptah update, checked against the project's key, and --back" <paths>`

### Task 5: Keeping the machine awake

**Files:**
- Create: `crates/ptah/src/awake.rs`
- Modify: `crates/ptah/src/cmd/supervise.rs` (start and stop it from the child's status), `crates/ptah/src/lib.rs`, `docs/engine.md` (the supervisor's section)
- Test: `crates/ptah/tests/awake.rs`, unit tests in `awake.rs`

**Interfaces:**
- Produces: `pub struct Awake` with `fn new(tool: Tool) -> Self`, `fn set(&mut self, show_loaded: bool)`, and `Drop` that stops the child; `pub enum Tool { Caffeinate, SystemdInhibit, None, Fake(PathBuf) }` and `Tool::detect()`.

- [ ] **Step 1: Write the failing tests** with `Tool::Fake` (a script that writes its pid to a file and sleeps): `set(true)` starts one child; `set(true)` again starts no second one; `set(false)` stops it; dropping `Awake` stops it; `Tool::None` does nothing. In `tests/awake.rs`, on a Mac only: run `ptah supervise --fake-io` on a temporary root, load the demo show through the API, and `pmset -g assertions` lists a `caffeinate` whose parent is the supervisor; unload it and it is gone; load again, kill the supervisor with SIGKILL, and within 2 s no `caffeinate` with that parent remains (Review Focus 5).
- [ ] **Step 2: Run** `cargo nextest run -p ptah awake` — FAIL.
- [ ] **Step 3: Implement.** The supervisor already starts its child with a status line per second (`--status`); it reads `showInfo` from those lines. `caffeinate -w <pid>` ends by itself when the supervisor's process ends, which covers the kill.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit**: `git commit -m "feat: ptah keeps the machine awake while a show is loaded" <paths>`

### Task 6: The two Settings lines

**Files (modify):** `packages/ds/src/settings/` (the About panel and the model's `changes.ts` for the new key, which applies at once), `apps/web/src/settings/SettingsPage.tsx` and its API client, their tests and stories, `apps/web/e2e/settings.spec.ts`.

**Interfaces:**
- Consumes: `GET /api/v1/update`, `POST /api/v1/update` (Tasks 3 and 4), `checkForUpdates` in settings (Task 2).
- Produces: the About panel shows "Version 2.0.0"; when a newer one is known, "PTAH 2.1.0 is available" with the button "Update" (disabled with "Unload the show to update" while a show is loaded; absent when `canUpdate` is false for another reason, with that reason as a line); the switch "Check for updates".

| State | Event | Result |
|---|---|---|
| Up to date | — | "Version 2.0.0" only |
| A newer version known | — | The "is available" line and Update |
| A show is loaded | — | Update disabled, the reason beside it |
| Update pressed | the answer is 202 | The panel says "Updating…", then the page reloads when the engine answers again with the new version |
| Update pressed | the answer is an error | A fault toast with the reason; the panel as before |
| "Check for updates" turned off | Save | No request for the update state after that; the line goes |

- [ ] **Step 1: Write the failing tests**: one per row, in the ds settings tests (with a mocked API) and one e2e test that serves a newer `latest.json` from a local folder through `PTAH_RELEASES_URL` and sees the line.
- [ ] **Step 2: Run** `pnpm -F @ptah-app/ds test -- settings && pnpm -F @ptah-app/web test -- settings` — FAIL.
- [ ] **Step 3: Implement** in the look the Settings screen has when this plan runs (the redesign's plan 6).
- [ ] **Step 4: Run** tests, the settings stories, the e2e file — PASS. Regenerate the settings boards that move. Owner looks at Settings → About.
- [ ] **Step 5: Commit** (code, then baselines).

### Task 7: The release workflow and the install script

**Files:**
- Create: `.github/workflows/release.yml`, `scripts/release-key.sh`, `scripts/make-release.sh` (builds one target's archive; used by the workflow and by tests), `install.sh` (at the repository's root), `packaging/homebrew/ptah.rb.in` (the formula's template), `docs/releasing.md`
- Modify: `crates/ptah/src/update/mod.rs` (the real public key, once the owner has made it; until then a placeholder that fails closed), `.github/workflows/ci.yml` (run the installer test)
- Test: `scripts/install.test.sh`, `scripts/make-release.test.sh`

**Interfaces:**
- Produces: on a tag `v*`, four archives, `SHA256SUMS`, `SHA256SUMS.sig`, `latest.json`, a GitHub Release whose notes are that version's section of `CHANGELOG.md`, and a filled `ptah.rb` attached to it. `install.sh` installs the latest release's `ptah` for this machine and is safe to run again.

- [ ] **Step 1: Write the failing tests.** `make-release.test.sh`: from a built `ptah`, it makes an archive whose only file is `ptah`, and a `SHA256SUMS` line that `shasum -c` accepts. `install.test.sh`, against a local release folder served over HTTP (the script takes `PTAH_RELEASES_URL` too): on a clean temporary `HOME` with a writable fake `/usr/local/bin` it installs there; with none writable it installs in `~/.local/bin` and prints the line to add to the path; a wrong fingerprint installs nothing and exits non-zero; run twice it leaves one `ptah`; it never calls `sudo` and never writes a file whose name starts with a dot in `HOME` other than `.local`; the installed `ptah --version` prints the release's version.
- [ ] **Step 2: Run** the two scripts — FAIL.
- [ ] **Step 3: Implement.** The workflow builds each target on its own runner (Apple silicon and Intel Mac runners; Linux x86-64 and ARM64 runners), in `--release`, runs `ptah --version` on the result, then one job gathers the archives, signs `SHA256SUMS` with `PTAH_RELEASE_KEY` and publishes. It runs only on tags. `docs/releasing.md` says, for the owner: make the key (once), add the secret (once), update `CHANGELOG.md`, push the tag.
- [ ] **Step 4: Run** the tests; `shellcheck install.sh scripts/*.sh` if it is installed. On CI, the installer test runs on the Mac and the Linux runner.
- [ ] **Step 5: Commit**: `git commit -m "feat: releases on a tag, and the one-line install of ptah" <paths>`

### Task 8: Checkpoint

- [ ] **Step 1:** `df -h /System/Volumes/Data | tail -1`; `du -sh target`; clean per AGENTS.md if needed.
- [ ] **Step 2:** `pnpm allcheck` — green. A failure that passes when re-run alone is reported as load, with the output.
- [ ] **Step 3: A rehearsal of a release, all local.** Build `ptah` in `--release` (check the disk first), make a `2.0.0` and a `2.0.1` release folder with `make-release.sh` and a test key, serve them, and with `PTAH_RELEASES_URL` set: run `install.sh` into a temporary `HOME`; start the installed `ptah` on a temporary root and see the demo and "local only"; see the "is available" line; `ptah update`; start again and see 2.0.1; `ptah update --back`. Write what happened in the report.
- [ ] **Step 4:** Update `README.md` (install with one line, update, where the files live) and `docs/releasing.md`. In the master plan, mark Step 7's first half done.
- [ ] **Step 5: The owner's actions**, listed in the final message, none done by the builder: read `docs/going-public.md` and decide; choose a licence; make the repository public; run `scripts/release-key.sh` and add `PTAH_RELEASE_KEY` to the repository's secrets, then commit the public half; push the first tag `v2.0.0`; create the Homebrew tap repository and put the release's `ptah.rb` in it. Commit: `git commit -m "docs: installing and releasing ptah" <paths>`.
