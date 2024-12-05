import { z } from "zod";

import { programName } from "./program.model";
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

export const pubsubMessageShowLoad = z.object({
  type: z.literal("show:load"),
  showName,
});

export const pubsubMessageShowReload = z.object({
  type: z.literal("show:reload"),
  showName,
});

export const pubsubMessageShowLoadSucess = z.object({
  type: z.literal("show:load:success"),
  showName,
});

export const pubsubMessageShowLoadError = z.object({
  type: z.literal("show:load:error"),
  showName,
});

export const pubsubMessageShowUnload = z.object({
  type: z.literal("show:unload"),
});

export const pubsubMessageProgramStarted = z.object({
  type: z.literal("program:started"),
  id: z.number(),
});

export const pubsubMessageProgramStopped = z.object({
  type: z.literal("program:stopped"),
  id: z.number(),
});

export const pubsubMessageProgramSaveSucess = z.object({
  type: z.literal("program:save:success"),
  programName,
});

export const pubsubMessageProgramSaveError = z.object({
  type: z.literal("program:save:error"),
  programName,
});

export const pubsubMessageDmxBlackOut = z.object({
  type: z.literal("dmx:blackout"),
});

export const pubsubMessageDmxDebug = z.object({
  type: z.literal("dmx:debug"),
  enabled: z.boolean(),
});

export const pubsubMessageDmxDebugData = z.object({
  type: z.literal("dmx:debug:data"),
  data: z.array(z.number()),
});

export const pubsubMessageDmxStatusGet = z.object({
  type: z.literal("dmx:status:get"),
});

export const pubsubMessageDmxStatusConnected = z.object({
  type: z.literal("dmx:status:connected"),
});

export const pubsubMessageDmxStatusDisconnected = z.object({
  type: z.literal("dmx:status:disconnected"),
});

export const pubsubMessageDmxStatusConnecting = z.object({
  type: z.literal("dmx:status:connecting"),
});

export const pubsubMessageMidiStatusGet = z.object({
  type: z.literal("midi:status:get"),
});

export const pubsubMessageMidiStatusInactive = z.object({
  type: z.literal("midi:status:inactive"),
});

export const pubsubMessageMidiStatusActive = z.object({
  type: z.literal("midi:status:active"),
});

export const pubsubMessageMidiStatusIdle = z.object({
  type: z.literal("midi:status:idle"),
});

export const pubsubMessageSystem = z.union([
  pubsubMessageShowLoad,
  pubsubMessageShowReload,
  pubsubMessageShowLoadSucess,
  pubsubMessageShowLoadError,
  pubsubMessageShowUnload,
  pubsubMessageProgramStarted,
  pubsubMessageProgramStopped,
  pubsubMessageProgramSaveSucess,
  pubsubMessageProgramSaveError,
  pubsubMessageDmxBlackOut,
  pubsubMessageDmxDebug,
  pubsubMessageDmxDebugData,
  pubsubMessageDmxStatusGet,
  pubsubMessageDmxStatusConnected,
  pubsubMessageDmxStatusDisconnected,
  pubsubMessageDmxStatusConnecting,
  pubsubMessageMidiStatusGet,
  pubsubMessageMidiStatusInactive,
  pubsubMessageMidiStatusActive,
  pubsubMessageMidiStatusIdle,
]);

export const pubsubMessage = z.union([pubsubMessageMidi, pubsubMessageSystem]);

export type PubsubMessageMidi = z.infer<typeof pubsubMessageMidi>;
export type PubsubMessageSystem = z.infer<typeof pubsubMessageSystem>;
export type PubsubMessage = z.infer<typeof pubsubMessage>;

type SocketMessageWrapper<T extends PubsubMessage> = (message: T) => void;

export type SocketPubsubMessage = {
  midi: SocketMessageWrapper<PubsubMessageMidi>;
  system: SocketMessageWrapper<PubsubMessageSystem>;
};

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

export type PubsubMessageLoadShow = z.infer<typeof pubsubMessageShowLoad>;
export type PubsubMessageDmxBlackOut = z.infer<typeof pubsubMessageDmxBlackOut>;

export type PubsubMessageShowLoad = z.infer<typeof pubsubMessageShowLoad>;
export type PubsubMessageShowReload = z.infer<typeof pubsubMessageShowReload>;
export type PubsubMessageShowUnload = z.infer<typeof pubsubMessageShowUnload>;
export type PubsubMessageShowLoadSucess = z.infer<
  typeof pubsubMessageShowLoadSucess
>;
export type PubsubMessageShowLoadError = z.infer<
  typeof pubsubMessageShowLoadError
>;

export type PubsubMessageProgramStarted = z.infer<
  typeof pubsubMessageProgramStarted
>;
export type PubsubMessageProgramStopped = z.infer<
  typeof pubsubMessageProgramStopped
>;

export type PubsubMessageProgramSaveSucess = z.infer<
  typeof pubsubMessageProgramSaveSucess
>;
export type PubsubMessageProgramSaveError = z.infer<
  typeof pubsubMessageProgramSaveError
>;

export type PubsubMessageDmxDebug = z.infer<typeof pubsubMessageDmxDebug>;
export type PubsubMessageDmxDebugData = z.infer<
  typeof pubsubMessageDmxDebugData
>;

export type PubsubMessageDmxStatusGet = z.infer<
  typeof pubsubMessageDmxStatusGet
>;
export type PubsubMessageDmxStatusConnected = z.infer<
  typeof pubsubMessageDmxStatusConnected
>;
export type PubsubMessageDmxStatusDisconnected = z.infer<
  typeof pubsubMessageDmxStatusDisconnected
>;
export type PubsubMessageDmxStatusConnecting = z.infer<
  typeof pubsubMessageDmxStatusConnecting
>;
