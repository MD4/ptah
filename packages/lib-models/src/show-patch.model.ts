import * as z from "zod";

import { uuid } from "./uuid.model";

export const showPatchCapabilityDimmer = z.object({
  type: z.literal("dimmer"),
});
export type ShowPatchCapabilityDimmer = z.infer<
  typeof showPatchCapabilityDimmer
>;

export const showPatchCapabilityColor = z.object({
  type: z.literal("color"),
});
export type ShowPatchCapabilityColor = z.infer<typeof showPatchCapabilityColor>;

export const showPatchCapabilityChannel = z.object({
  type: z.literal("channel"),
  // Index into the fixture profile's channels (white/generic escape hatch).
  channelIndex: z.number().int().min(0).max(511),
});
export type ShowPatchCapabilityChannel = z.infer<
  typeof showPatchCapabilityChannel
>;

export const showPatchCapability = z.union([
  showPatchCapabilityDimmer,
  showPatchCapabilityColor,
  showPatchCapabilityChannel,
]);
export type ShowPatchCapability = z.infer<typeof showPatchCapability>;

// Same numeric constraint as the legacy programOutput (deliberately no .int():
// the 0.4.0 migration passes legacy values through untouched).
const programOutputId = z.number().min(0).max(127);

export const showPatchEntryScalar = z.object({
  programId: uuid,
  outputKind: z.literal("scalar"),
  outputId: programOutputId,
  fixtureId: uuid,
  capability: z.union([showPatchCapabilityDimmer, showPatchCapabilityChannel]),
});
export type ShowPatchEntryScalar = z.infer<typeof showPatchEntryScalar>;

export const showPatchEntryColor = z.object({
  programId: uuid,
  outputKind: z.literal("color"),
  outputId: programOutputId,
  fixtureId: uuid,
  capability: showPatchCapabilityColor,
});
export type ShowPatchEntryColor = z.infer<typeof showPatchEntryColor>;

export const showPatchEntry = z.union([
  showPatchEntryScalar,
  showPatchEntryColor,
]);
export type ShowPatchEntry = z.infer<typeof showPatchEntry>;

export const showPatch = z.array(showPatchEntry);
export type ShowPatch = z.infer<typeof showPatch>;
