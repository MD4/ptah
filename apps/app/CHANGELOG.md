# @ptah-app/app

## 0.3.0

### Minor Changes

- e20ec80: Add a file migration system: resource JSON files are stamped with the app
  version and upgraded on load (lazy, with a backup under `~/.ptah/.backups/`)
  before Zod validation. Ships the first migration, fixing program loading broken
  by the `targetIntput → targetInput` edge-field rename (#218).

### Patch Changes

- Updated dependencies [e20ec80]
  - @ptah-app/lib-shared@0.3.0
  - @ptah-app/service-api@0.2.4
  - @ptah-app/service-gateway-ws@0.2.4
  - @ptah-app/service-main@0.2.4
  - @ptah-app/service-midi@0.2.4
  - @ptah-app/ui-admin@0.2.4

## 0.2.3

### Patch Changes

- 4d55081: Publish fix
- Updated dependencies [4d55081]
  - @ptah-app/service-api@0.2.3
  - @ptah-app/service-bus@0.2.3
  - @ptah-app/service-gateway-ws@0.2.3
  - @ptah-app/service-main@0.2.3
  - @ptah-app/service-midi@0.2.3
  - @ptah-app/ui-admin@0.2.3
  - @ptah-app/lib-shared@0.2.3

## 0.2.2

### Patch Changes

- 496ed4e: Bug fixes & tests
- Updated dependencies [496ed4e]
  - @ptah-app/service-api@0.2.2
  - @ptah-app/service-bus@0.2.2
  - @ptah-app/service-gateway-ws@0.2.2
  - @ptah-app/service-main@0.2.2
  - @ptah-app/service-midi@0.2.2
  - @ptah-app/ui-admin@0.2.2
  - @ptah-app/lib-shared@0.2.2

## 0.2.1

### Patch Changes

- 38dcc4a: upgrade dependencies
- Updated dependencies [38dcc4a]
  - @ptah-app/service-api@0.2.1
  - @ptah-app/service-bus@0.2.1
  - @ptah-app/service-gateway-ws@0.2.1
  - @ptah-app/service-main@0.2.1
  - @ptah-app/service-midi@0.2.1
  - @ptah-app/ui-admin@0.2.1
  - @ptah-app/lib-shared@0.2.1

## 0.2.0

### Minor Changes

- 0b79de1:

### Patch Changes

- Updated dependencies [0b79de1]
  - @ptah-app/service-api@0.2.0
  - @ptah-app/service-bus@0.2.0
  - @ptah-app/service-gateway-ws@0.2.0
  - @ptah-app/service-main@0.2.0
  - @ptah-app/service-midi@0.2.0
  - @ptah-app/ui-admin@0.2.0
  - @ptah-app/lib-shared@0.2.0

## 0.1.0

### Minor Changes

- 3a09045: First release 🎉

### Patch Changes

- Updated dependencies [3a09045]
  - @ptah-app/service-api@0.1.0
  - @ptah-app/service-bus@0.1.0
  - @ptah-app/service-gateway-ws@0.1.0
  - @ptah-app/service-main@0.1.0
  - @ptah-app/service-midi@0.1.0
  - @ptah-app/ui-admin@0.1.0
  - @ptah-app/lib-shared@0.1.0
