#!/usr/bin/env bash
#
# Release script for the PTAH monorepo (Changesets-based, manual publish).
#
# Usage:
#   pnpm release             Full release: version -> publish to npm -> tag -> push -> GitHub release
#   pnpm release:dry         Preview only: pre-flight + build + planned bumps, no mutations
#   pnpm release --yes       Skip the interactive confirmation prompt (implied when non-interactive/CI)
#   pnpm release --dry-run   Same as release:dry
#
# Reliability features:
#   - No interactive `changeset` authoring step (changesets are authored during feature work).
#   - Pre-flight checks: branch, clean tree, in sync with origin, npm auth, pending changesets.
#   - Retries `changeset publish` to ride out transient npm/TLS errors (publish is idempotent).
#   - Confirmation prompt before the irreversible publish (auto-skipped in CI / with --yes).
#   - Creates a GitHub Release for @ptah-app/app once tags are pushed (if `gh` is available).
set -euo pipefail

DRY_RUN=0
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --yes | -y) ASSUME_YES=1 ;;
    -h | --help)
      awk 'NR>1 && /^#/{sub(/^# ?/,"");print;next} NR>1{exit}' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

# Never block on a prompt in CI or when stdin is not a TTY.
if [ -n "${CI:-}" ] || [ ! -t 0 ]; then ASSUME_YES=1; fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

BASE_BRANCH="master"
MAX_PUBLISH_ATTEMPTS=5

info() { printf '\n\033[36m▶ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m⚠ %s\033[0m\n' "$*"; }
die() {
  printf '\033[31m✖ %s\033[0m\n' "$*" >&2
  exit 1
}

# Hard-fail for a real release, soft-warn during a dry run.
require() {
  if [ "$DRY_RUN" = "1" ]; then warn "$1"; else die "$1"; fi
}

# ── Pre-flight ────────────────────────────────────────────────────────────────
info "Pre-flight checks"

current_branch="$(git rev-parse --abbrev-ref HEAD)"
[ "$current_branch" = "$BASE_BRANCH" ] || require "Not on '$BASE_BRANCH' (currently on '$current_branch')."

if [ -n "$(git status --porcelain)" ]; then
  require "Working tree is not clean; commit or stash changes first."
fi

git fetch origin "$BASE_BRANCH" --quiet 2>/dev/null || warn "Could not fetch origin/$BASE_BRANCH."
if git rev-parse --verify "origin/$BASE_BRANCH" >/dev/null 2>&1; then
  if [ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$BASE_BRANCH")" ]; then
    require "Local '$BASE_BRANCH' is not in sync with origin/$BASE_BRANCH."
  fi
fi

if npm whoami >/dev/null 2>&1; then
  echo "  npm user: $(npm whoami)"
else
  require "Not authenticated to npm (npm whoami failed). Run 'npm login' or set the .npmrc token."
fi

pending="$(find .changeset -maxdepth 1 -name '*.md' ! -name 'README.md' 2>/dev/null | wc -l | tr -d ' ')"
if [ "$pending" = "0" ]; then
  require "No pending changesets in .changeset/. Add one with 'pnpm exec changeset' first."
else
  echo "  pending changesets: $pending"
fi

info "Planned version bumps"
pnpm exec changeset status --verbose || true

# ── Validate ──────────────────────────────────────────────────────────────────
info "Clean, check, build"
if [ "$DRY_RUN" = "0" ]; then pnpm clean; fi
pnpm allcheck
pnpm build

if [ "$DRY_RUN" = "1" ]; then
  info "DRY RUN complete — nothing versioned, published, or pushed."
  echo "A real run would: changeset version → changeset publish (≤${MAX_PUBLISH_ATTEMPTS} attempts) → git push + tags → gh release create"
  exit 0
fi

# ── Version ─────────────────────────────────────────────────────────────────
info "Versioning packages (changeset version)"
pnpm exec changeset version

# .changeset/config.json sets commit:true, but commit defensively if anything remains.
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "chore(release): version packages"
fi

APP_VERSION="$(node -p "require('./apps/app/package.json').version")"

echo
echo "About to publish these public packages to npm:"
for pkg in apps/*/package.json packages/*/package.json; do
  node -e "const p=require('./$pkg'); if(!p.private) console.log('  '+p.name+'@'+p.version)"
done
echo

# ── Confirm ─────────────────────────────────────────────────────────────────
if [ "$ASSUME_YES" != "1" ]; then
  printf "Type 'yes' to publish to npm (this is irreversible): "
  read -r reply
  if [ "$reply" != "yes" ]; then
    warn "Aborted before publish. The local version commit is at HEAD (not pushed)."
    echo "To undo it: git reset --hard \"origin/$BASE_BRANCH\""
    exit 1
  fi
fi

# ── Publish (with retry) ──────────────────────────────────────────────────────
# Tune npm's own retry/backoff, then wrap in an outer loop: `changeset publish`
# is idempotent (it skips versions already on the registry), so re-running only
# retries the packages that did not make it — riding out transient npm/TLS errors.
export npm_config_fetch_retries=5
export npm_config_fetch_retry_mintimeout=10000
export npm_config_fetch_retry_maxtimeout=120000

info "Publishing to npm"
attempt=1
until pnpm exec changeset publish; do
  if [ "$attempt" -ge "$MAX_PUBLISH_ATTEMPTS" ]; then
    die "changeset publish failed after $attempt attempts. Re-run 'pnpm release' (idempotent) once the network recovers."
  fi
  warn "Publish attempt $attempt failed (often a transient npm/TLS error). Retrying in 5s…"
  attempt=$((attempt + 1))
  sleep 5
done

# ── Push ──────────────────────────────────────────────────────────────────────
info "Pushing commit and tags to origin/$BASE_BRANCH"
git push origin "$BASE_BRANCH"
git push origin --tags

# ── GitHub release ─────────────────────────────────────────────────────────────
APP_TAG="@ptah-app/app@${APP_VERSION}"
if command -v gh >/dev/null 2>&1; then
  info "Creating GitHub release for $APP_TAG"
  notes="$(awk '/^## /{c++} c==1{print} c==2{exit}' apps/app/CHANGELOG.md 2>/dev/null || true)"
  if gh release view "$APP_TAG" >/dev/null 2>&1; then
    warn "GitHub release $APP_TAG already exists; skipping."
  else
    gh release create "$APP_TAG" --title "$APP_TAG" --notes "${notes:-Release ${APP_VERSION}}" ||
      warn "gh release create failed; create it manually for $APP_TAG."
  fi
else
  warn "gh CLI not found; skipping GitHub release (tag $APP_TAG is pushed)."
fi

info "Release complete: @ptah-app/app@${APP_VERSION} published and pushed."
