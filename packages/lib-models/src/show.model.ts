import * as z from "zod";

import { getFixtureProfile } from "./fixture-profile.model";
import { showFixtures } from "./show-fixture.model";
import { showMapping } from "./show-mapping.model";
import { showPatch } from "./show-patch.model";
import { showPrograms } from "./show-programs.model";
import { uuid } from "./uuid.model";
import { version } from "./version.model";

export const showName = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[\w-]+$/);
export type ShowName = z.infer<typeof showName>;

// Base kept as a ZodObject: superRefine returns an effects type without
// .pick(), and showCreate needs .pick({ name: true }).
const showBase = z.object({
  id: uuid,
  name: showName,
  mapping: showMapping,
  fixtures: showFixtures,
  patch: showPatch,
  programs: showPrograms,
  version: z.optional(version),
});

export const show = showBase.superRefine((value, ctx) => {
  const seenIds = new Set<string>();

  value.fixtures.forEach((fixture, index) => {
    if (seenIds.has(fixture.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["fixtures", index, "id"],
        message: `Duplicate fixture id "${fixture.id}"`,
      });
    }
    seenIds.add(fixture.id);

    const profile = getFixtureProfile(fixture.profileId);

    if (!profile) {
      ctx.addIssue({
        code: "custom",
        path: ["fixtures", index, "profileId"],
        message: `Unknown fixture profile "${fixture.profileId}"`,
      });
      return;
    }

    if (fixture.startChannel + profile.channels.length - 1 > 512) {
      ctx.addIssue({
        code: "custom",
        path: ["fixtures", index, "startChannel"],
        message: "Fixture does not fit in the 512-channel universe",
      });
    }
  });
});
export type Show = z.infer<typeof show>;

export const showCreate = showBase.pick({ name: true });
export type ShowCreate = z.infer<typeof showCreate>;
