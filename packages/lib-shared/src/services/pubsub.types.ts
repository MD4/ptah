export type Channel = "system" | "midi";

export type MessageNoteOn = {
  type: "note:on";
  keyNumber: number;
  velocity: number;
};

export type MessageNoteOff = {
  type: "note:off";
  keyNumber: number;
  velocity: number;
};

export type MessageTempoChange = {
  type: "tempo:change";
  tempo: number;
};

export type MessageSequenceStart = {
  type: "sequence:start";
};

export type MessageSequenceContinue = {
  type: "sequence:continue";
};

export type MessageSequenceStop = {
  type: "sequence:stop";
};

export type MessageClockTick = {
  type: "clock:tick";
  deltaTime: number;
};

export type MessageControlChange = {
  type: "control:change";
  controlId: number;
  value: number;
};

export type Message =
  | MessageNoteOn
  | MessageNoteOff
  | MessageTempoChange
  | MessageSequenceStart
  | MessageSequenceContinue
  | MessageSequenceStop
  | MessageClockTick
  | MessageControlChange;
