---
"@ptah-app/app": minor
"@ptah-app/lib-models": minor
"@ptah-app/lib-shared": minor
"@ptah-app/lib-domains": minor
---

Add a file migration system: resource JSON files are stamped with the app
version and upgraded on load (lazy, with a backup under `~/.ptah/.backups/`)
before Zod validation. Ships the first migration, fixing program loading broken
by the `targetIntput → targetInput` edge-field rename (#218).
