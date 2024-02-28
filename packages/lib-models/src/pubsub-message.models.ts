import { z } from "zod";
import { showName } from "./show.model";

export const pubsubChannel = z.union([z.literal("system"), z.literal("midi")]);
export type PubsubChannel = z.infer<typeof pubsubChannel>;

export const pubsubMessageNoteOn = z.object({
  type: z.literal("note:on"),
  keyNumber: z.number(),
  velocity: z.number(),
});

export const pubsubMessageNoteOff = z.object({
  type: z.literal("note:off"),
  keyNumber: z.number(),
  velocity: z.number(),
});

export const pubsubMessageTempoChange = z.object({
  type: z.literal("tempo:change"),
  tempo: z.number(),
});

export const pubsubMessageSequenceStart = z.object({
  type: z.literal("sequence:start"),
});

export const pubsubMessageSequenceContinue = z.object({
  type: z.literal("sequence:continue"),
});

export const pubsubMessageSequenceStop = z.object({
  type: z.literal("sequence:stop"),
});

export const pubsubMessageClockTick = z.object({
  type: z.literal("clock:tick"),
  deltaTime: z.number(),
});

export const pubsubMessageControlChange = z.object({
  type: z.literal("control:change"),
  controlId: z.number(),
  value: z.number(),
});

export const pubsubMessageMidi = z.union([
  pubsubMessageNoteOn,
  pubsubMessageNoteOff,
  pubsubMessageTempoChange,
  pubsubMessageSequenceStart,
  pubsubMessageSequenceContinue,
  pubsubMessageSequenceStop,
  pubsubMessageClockTick,
  pubsubMessageControlChange,
]);

export const pubsubMessageLoadShow = z.object({
  type: z.literal("show:load"),
  showName,
});

export const pubsubMessageUnloadShow = z.object({
  type: z.literal("show:unload"),
});

export const pubsubMessageBlackOut = z.object({
  type: z.literal("blackout"),
});

export const pubsubMessageSystem = z.union([
  pubsubMessageLoadShow,
  pubsubMessageUnloadShow,
  pubsubMessageBlackOut,
]);

export const pubsubMessage = z.union([pubsubMessageMidi, pubsubMessageSystem]);

export type PubsubMessageMidi = z.infer<typeof pubsubMessageMidi>;
export type PubsubMessageSystem = z.infer<typeof pubsubMessageSystem>;
export type PubsubMessage = z.infer<typeof pubsubMessage>;

export type PubsubMessageNoteOn = z.infer<typeof pubsubMessageNoteOn>;
export type PubsubMessageNoteOff = z.infer<typeof pubsubMessageNoteOff>;
export type PubsubMessageTempoChange = z.infer<typeof pubsubMessageTempoChange>;
export type PubsubMessageSequenceStart = z.infer<
  typeof pubsubMessageSequenceStart
>;
export type PubsubMessageSequenceContinue = z.infer<
  typeof pubsubMessageSequenceContinue
>;
export type PubsubMessageSequenceStop = z.infer<
  typeof pubsubMessageSequenceStop
>;
export type PubsubMessageClockTick = z.infer<typeof pubsubMessageClockTick>;
export type PubsubMessageControlChange = z.infer<
  typeof pubsubMessageControlChange
>;

export type PubsubMessageLoadShow = z.infer<typeof pubsubMessageLoadShow>;
export type PubsubMessageBlackOut = z.infer<typeof pubsubMessageBlackOut>;
