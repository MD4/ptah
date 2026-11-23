# PTAH V2 — Step 7: Packaging (design)

Status: draft for the owner's approval. Brainstormed on 2026-11-23. Code: `~/projects/ptah-v2`. Master plan: `2026-10-25-v2-master-plan.md`, Step 7.

## Intent

Today PTAH V2 runs only from its source folder with developer commands. This step makes it something you install. Two kinds of people use it, and both ways in must keep working:

- **The owner**, on his Mac, for programming lights, rehearsals and shows. He keeps the command line plus the web screens. He wants a `ptah` command installed outside the source folder, which he can update, and which he will call from a shell alias on show night.
- **His friends**, a handful of people he sends a link to. They are beginners: they get a packaged app and must be able to set it up simply.

Why now: V2 has every feature of V1 and a redesigned interface, but nobody besides the owner can run it.

## Goals

1. A friend with a Mac installs PTAH with one action, opens it like any app, and within ten minutes holds Flash and sees a real light blink.
2. The owner has `ptah` on his path, at the same version as the app, sharing the same shows and settings.
3. PTAH can be updated without reinstalling, and never changes under someone during a show.
4. Nothing built here blocks Linux or Windows.

## Non-goals

- The box (a Raspberry Pi in the lighting case). The owner has no use for it yet. It becomes its own later step; the notes on connecting Reaper to a remote box stay in the master plan.
- A Windows release. It is a later piece of its own, and may come sooner than "someday".
- The app window on Linux. Linux gets the command only in this step.
- A public launch: no website, no app store, no videos, no support channel.
- Starting Reaper. PTAH does not learn about Reaper projects; the owner's alias opens Reaper.
- Any new lighting feature.

## Anti-goals (these would make the step a failure even if it works)

- A friend meets "PTAH can't be opened" or "PTAH is damaged" and gives up.
- PTAH updates itself, or asks to, while a show is loaded.
- The app and the command drift apart: two versions, or two sets of shows.
- The engine process gains window or packaging code.
- A cost for the owner. He will not pay for a developer account or a certificate; do not design anything that needs one.

## Constraints

- The app is not signed with an Apple Developer identity and is not notarised. The owner refuses the paid account.
- No new dependency younger than 14 days; every dependency pinned exactly.
- The engine stays a small program with no dependency on the shell around it (master plan, section 4).
- The interface is the existing web app, unchanged in what it does.
- Never touch the owner's `~/.ptah` or `~/ptah-home` while building or testing.
- Disk rules of `AGENTS.md` apply to every build.

## Approaches considered

1. **A thin shell around today's `ptah` (chosen).** A small Tauri app that carries the `ptah` program inside it. Opening the app starts `ptah` in the background and shows the screens in its own window. The engine is untouched; the command inside the app is the command line's own file, so the two cannot drift; Tauri packages for Mac, Linux and Windows. Cost: the window uses the system's web engine (WebKit on a Mac), so the screens must be tested there; one new dependency.
2. **`ptah` opens its own window** (`ptah app`). One file, no shell. Rejected: window code would live in the program that runs the show, against the master plan, and packaging for three systems would be built by hand.
3. **Electron.** The screens would look exactly as tested in Chrome. Rejected: about 150 MB for an engine of a few MB, and a second runtime to keep current.

The owner left the choice of approach to the builder and agreed to approach 1.

## What the owner decided

- **Two ways in**: a packaged app for friends; the command line plus web screens for himself.
- **The app has its own window**; it is not a launcher that opens the browser.
- **Unsigned.** No paid developer account.
- **Install**: one line pasted in Terminal is the main way. A normal download with a picture guide for "Open Anyway" is the fallback. A Homebrew tap is an extra for the command.
- **The app and the command are always installed together.**
- **Updates**: PTAH says a new version exists and the person chooses when. Never while a show is loaded.
- **PTAH keeps the machine awake** while a show is loaded.
- **The `ptah-v2` repository becomes public**; downloads live on its Releases page.
- **Order of systems**: Mac, then Linux, then Windows.
- **First run**: a demo show; no wizard.

## The design

### What gets installed

One install puts two things in place, from one release:

- **PTAH.app** in `/Applications`. It contains the `ptah` program.
- **`ptah`** on the path, as a link to the program inside the app. So the command line and the app are the same file at the same version.

Both read and write the same root folder (`~/.ptah` unless `PTAH_HOME` or `--root` says otherwise), as `ptah` does today.

### Installing

- **The one line.** A short shell script, hosted in the repository, fetched and run by one pasted line. It downloads the release for this Mac's processor, checks its fingerprint, puts PTAH.app in `/Applications` (in `~/Applications` if that is not writable; updates then stay there), links `ptah` (in `/usr/local/bin` if writable, else `~/.local/bin`), and opens the app. It never asks for a password and never edits a shell profile: if the folder it linked into is not on the path, it prints the one line to add. A friend who only uses the app never needs the command. A file fetched this way carries no "downloaded from the internet" mark, so the Mac opens the app without its security refusal. The script asks for nothing and changes nothing else. Run again, it updates.
- **The normal download.** The same release as a disk image on the Releases page, for someone who will not use Terminal. The guide shows the "Open Anyway" step with pictures.
- **Homebrew.** A tap in a public repository with a formula for `ptah` (a formula cannot install an app; that would be a cask, which Homebrew marks as downloaded). Whether the tap can also bring the app cleanly is tested on a real Mac during the build; if it cannot, the tap installs the command only and says how to get the app.
- **A local signature.** Apple-silicon Macs refuse programs with no signature at all. The build gives the app a free, local ("ad hoc") signature. It needs no account.

To verify on a real Mac before relying on it: that the one-line install opens with no security refusal on the current macOS and the one before; that an in-app update does not bring the refusal back.

### Opening the app

- The app starts `ptah --no-open` as its child, the same way a person starts it from a terminal (the supervisor that restarts the engine after a crash is part of `ptah`), and points its window at `http://127.0.0.1:<port>` once the engine answers. The web app is already built into `ptah`, so nothing else is served. While waiting it shows the PTAH logo and one line of state.
- **The port** is the one in settings (`uiPort`), as for the command line. If something that is not PTAH holds it, the app asks `ptah` for the next free port and says so on the waiting screen.
- **An engine already running.** `ptah` already refuses to start twice on one port (exit code 2 after probing `GET /api/v1/server`). The app treats that as "join it": it shows the running one. That answer gains the root folder it serves; if it is not the folder the app was to use, the app says "PTAH is already running with another folder" and offers Quit, and joins nothing.
- **No orphans.** `ptah` started by the app ends when the app ends, however the app ends (it watches the pipe the app holds open), so a force-quit leaves no engine behind for the next launch to join by mistake.
- Closing the window with a show loaded asks first: "A show is loaded. Quit PTAH and stop the lights?" with Quit and Cancel. With no show loaded it quits. Quitting stops the engine cleanly.
- Phones and other computers keep opening the screens in a browser at the address the checklist shows.
- The window remembers its size and place. It has the standard menus only (About, Quit, Copy and Paste, Window, a Help item that opens the guide).

### Keeping the machine awake

"A show is loaded" means one thing everywhere in this design (the quit question, the update refusal, keeping awake): the engine's state has a show (`showInfo` is set), as the Live screen reads it today. The supervisor reads it from the status line its child already prints.

While a show is loaded, PTAH asks the system not to sleep and not to dim the display into sleep. It stops asking when the show is unloaded or PTAH quits. This is done by the `ptah` supervisor, not by the app shell, so it also holds when the owner runs `ptah` from a terminal. On a Mac it uses the system's power assertion; Linux and Windows have their own, added with those systems. The engine's render process is not involved.

### The demo show

A new PTAH (an empty root folder) is seeded with a small demo: one show, one venue with a pretend rig of eight lights on one universe with no output, and three or four programs. The checklist's Show row offers it as it offers any remembered show. Playing it needs no hardware and no Reaper: the test note in Effects and the hold-to-play in Show already work without them, and the preview swatches show the result.

The demo is ordinary files, made with the app, kept in the repository under a `demo/` folder and checked by the same file checks as the fixtures. It is seeded by `ptah` itself at start, for both doors, and only into a root that has no show; it is never added to an existing root. The pretend rig's universe uses the output "none", which exists today.

### The guide

One page, written for a band member who has never used a terminal. Four parts: install; play the demo; your first light (plug the DMX box, add a universe and a fixture, hold Flash); connect Reaper (the LIGHTS track and its output, taken from the master plan's Reaper notes). It ships inside the app (Help opens it in the window) and is the repository's `docs/guide.md`.

### Updates

One mechanism, inside `ptah`, used by both doors.

- **Checking.** At start, and at most once a day, `ptah` asks the Releases page for the latest version. A machine with no network just skips it. Settings gain "Check for updates" (on by default).
- **Telling.** The app shows it in Settings' About panel and as a calm notice on Live's checklist: "PTAH 2.x is available" with "Update". From a terminal, `ptah` prints one line at start. Nothing is shown while a show is loaded.
- **Updating.** "Update" in the app, or `ptah update` from a terminal. It is refused while a show is loaded, saying so. It downloads the release, checks it (below), and replaces the whole app, shell and `ptah` together, by putting the new app beside the old one and swapping the two names; the archive already carries its local signature from the build. Then the app relaunches itself. If the app's window is open and `ptah update` is typed in a terminal, it says to use the app's Update or to quit the app first. Run from a terminal with no app open (the owner's case, and Linux), it swaps and says to start `ptah` again. If anything fails, the old version stays and the reason is shown.
- **The check.** Each release carries a file of SHA-256 fingerprints and a signature of that file made with the project's own Ed25519 key. `ptah` has the public key built in and refuses an update whose signature or fingerprint does not match. The one-line installer has no such key on a new machine: it checks the SHA-256 only, over HTTPS from GitHub, which guards against a broken download but not against a tampered release page. That is the accepted limit of an unsigned first install.
- **Going back.** The previous version is kept beside the new one until the new one has started once; `ptah update --back` restores it.

### Releases

- A release is made by pushing a version tag. GitHub's build then produces: PTAH.app for Apple-silicon and Intel Macs, as two separate builds (each as a disk image and as the archive the installer uses), `ptah` for Linux x86-64 and ARM64, the fingerprints file and its signature. The release's notes are written by hand in the repository's `CHANGELOG.md`.
- Versions follow `2.minor.patch`. The app, the command and the update check all read the one version of the Rust workspace.
- The project's signing key for the fingerprints is created once; its private half lives in the repository's secrets, never in the code.

### Going public

Before the repository is made public, its whole tracked history is scanned (untracked local files such as the design brief and the plans' workspaces are not in the repository and are not published) for anything private: keys and tokens, personal addresses, names and band material in fixtures and notes, and the untracked design brief. The owner sees the findings and decides. Making it public is the owner's own action.

### Testing

- The screens run their existing end-to-end tests once more on WebKit, the engine the window uses, and what differs is fixed.
- The app shell has its own tests: it starts the engine, shows the screens, finds a running engine, asks before closing with a show loaded, and quits cleanly.
- The installer script is tested on a clean macOS runner: install, open, update, go back.
- The update path is tested from a release made for the test to the next one.
- The keep-awake request is tested by reading the system's list of assertions.
- Linux: the released `ptah` is started on a runner and answers.

### What is left to the builder

- The exact Tauri version and its plugins, within the dependency rule.
- Where the installer links `ptah` when neither usual folder is on the path.
- The layout of the waiting screen and the wording of the app's few new sentences (the quit question, the update notices), in the plain style of the rest of the app.
- How the demo's programs look, as long as they show a dimmer, a colour and a movement over the eight lights.
- The split of this work into plans.

## Calls I made (the owner can overrule any of them)

- **Linux gets the command only** in this step; the app window on Linux comes with whoever first needs it.
- **The guide is one page inside the app**, not a website.
- **The update logic lives in `ptah`**, not in the app shell, so the command line and Linux have it too.
- **The keep-awake request lives in the supervisor**, so it holds for the owner's terminal use as well.
- **The demo is seeded only into an empty root.**
- **The app joins an engine that is already running** instead of starting a second one.
- **"Check for updates" can be turned off** in Settings.
- **The app uses the settings' port and joins a running PTAH of the same folder**; it refuses to join one that serves another folder.
- **`ptah` started by the app ends with the app.**
- **The installer never asks for a password and never edits a shell profile.**
- **The first install checks a fingerprint only; updates check a signature.**

## For later

- **Windows.** Needs: a MIDI port Reaper can send to (Windows cannot create one; a small free tool such as loopMIDI does), a Windows form of real-time priority, a Windows supervisor, Windows test runs, someone with Windows and a DMX box to check real lights, and the unsigned-installer warning. Nothing in this design is Mac-only by choice: Tauri, the installer's steps, the update mechanism and the keep-awake request each have a Windows form.
- **The box.** Its own step, when the owner wants it.
- **The app window on Linux.**
