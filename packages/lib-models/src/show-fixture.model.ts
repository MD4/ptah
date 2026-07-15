import * as z from "zod";

import { fixtureProfileId } from "./fixture-profile.model";
import { uuid } from "./uuid.model";

export const dmxChannel = z.number().int().min(1).max(512);
export type DmxChannel = z.infer<typeof dmxChannel>;

export const showFixture = z.object({
  id: uuid,
  name: z.string().min(1).max(255),
  profileId: fixtureProfileId,
  startChannel: dmxChannel,
});
export type ShowFixture = z.infer<typeof showFixture>;

export const showFixtures = z.array(showFixture);
export type ShowFixtures = z.infer<typeof showFixtures>;
