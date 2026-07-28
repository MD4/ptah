---
"@ptah-app/app": minor
"@ptah-app/lib-models": minor
"@ptah-app/lib-domains": minor
"@ptah-app/lib-utils": minor
"@ptah-app/lib-shared": minor
"@ptah-app/service-main": minor
"@ptah-app/service-api": minor
"@ptah-app/ui-admin": minor
---

Fixtures & color patching: patch lights instead of raw DMX channels.

- Shows now hold **fixtures** (built-in profiles: Dimmer, RGB, RGBW, RGB+Dimmer,
  RGBW+Dimmer) placed at a start address, and the patch wires program outputs to
  fixture **capabilities** (color / dimmer / channel) instead of raw channels —
  the whole 512-channel universe is now addressable from the UI (previously
  capped at 64).
- New **COLOR** program node (`output-color`): compose a color in RGB or HSV
  (wireable inputs, live swatch preview) and drive an entire RGB(W) fixture with
  one wire.
- The patch page is now a fixture rack with add/edit dialogs, address
  auto-suggestion, overlap warnings and color-aware connection validation.
- **Existing show files are migrated automatically** on first load (a backup is
  written to `~/.ptah/.backups/shows/`): each patched channel becomes a
  1-channel "Channel N" dimmer fixture, keeping DMX output byte-identical.
  Legacy patch entries on channels outside 1..512 (which never reached the
  wire) are dropped.
