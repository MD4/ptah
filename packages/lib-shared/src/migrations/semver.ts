/**
 * Parse a semver string into its numeric [major, minor, patch] core. Prerelease
 * (`-rc1`) and build (`+build`) metadata are ignored for ordering — PTAH ships
 * clean release versions, so core comparison is sufficient.
 */
export const parseVersion = (v: string): [number, number, number] => {
  const core = v.split("+")[0].split("-")[0];
  const [major = 0, minor = 0, patch = 0] = core.split(".").map(Number);
  return [major, minor, patch];
};

/** Returns -1 if a < b, 1 if a > b, 0 if equal (by major.minor.patch). */
export const compareVersions = (a: string, b: string): number => {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) {
      return pa[i] < pb[i] ? -1 : 1;
    }
  }
  return 0;
};
