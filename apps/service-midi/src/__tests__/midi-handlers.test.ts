jest.mock("@ptah-app/lib-shared", () => ({
  services: {
    pubsub: {
      send: jest.fn(),
    },
  },
}));

import { services } from "@ptah-app/lib-shared";
import { handleMidiCallback } from "../midi-handlers";
import {
  MIDI_STATUS_SYSTEM_START_SEQUENCE,
  MIDI_STATUS_SYSTEM_CONTINUE_SEQUENCE,
  MIDI_STATUS_SYSTEM_STOP_SEQUENCE,
  MIDI_STATUS_SYSTEM_TIMING_CLOCK,
  MIDI_STATUS_CHANNEL_NOTE_ON,
  MIDI_STATUS_CHANNEL_NOTE_OFF,
  MIDI_STATUS_CHANNEL_CONTROL_CHANGE,
} from "../constants";

const send = services.pubsub.send as jest.Mock;
const CHANNEL = 1;
const callback = handleMidiCallback(CHANNEL);

const sendMsg = (status: number, d1 = 0, d2 = 0, dt = 0) =>
  callback(dt, [status, d1, d2]);

beforeEach(() => {
  jest.useFakeTimers();
  send.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── System messages ──────────────────────────────────────────────────────────

describe("sequence:start", () => {
  it("sends sequence:start message", () => {
    sendMsg(MIDI_STATUS_SYSTEM_START_SEQUENCE);
    expect(send).toHaveBeenCalledWith("midi", { type: "sequence:start" });
  });
});

describe("sequence:continue", () => {
  it("sends sequence:continue message", () => {
    sendMsg(MIDI_STATUS_SYSTEM_CONTINUE_SEQUENCE);
    expect(send).toHaveBeenCalledWith("midi", { type: "sequence:continue" });
  });
});

describe("sequence:stop", () => {
  it("sends sequence:stop message", () => {
    sendMsg(MIDI_STATUS_SYSTEM_STOP_SEQUENCE);
    expect(send).toHaveBeenCalledWith("midi", { type: "sequence:stop" });
  });
});

// ─── Timing clock ─────────────────────────────────────────────────────────────
// NOTE: These tests share module-level `tempo` state and must run in order.
// Each test uses a unique BPM to ensure a state change is always triggered.

describe("clock:tick", () => {
  it("sends clock:tick with deltaTime", () => {
    sendMsg(MIDI_STATUS_SYSTEM_TIMING_CLOCK, 0, 0, 0.02);
    expect(send).toHaveBeenCalledWith("midi", { type: "clock:tick", deltaTime: 0.02 });
  });

  // tempo module state starts at 120; use 140 BPM to guarantee a change
  it("sends tempo:change after debounce with CORRECT new tempo (B5 fix)", () => {
    const dt = 1 / 140 / 24;
    const expectedTempo = Math.round((1 / dt / 24) * 60);

    sendMsg(MIDI_STATUS_SYSTEM_TIMING_CLOCK, 0, 0, dt);
    jest.advanceTimersByTime(200);

    const tempoCalls = send.mock.calls.filter(([, msg]) => msg.type === "tempo:change");
    expect(tempoCalls.length).toBe(1);
    expect(tempoCalls[0][1].tempo).toBe(expectedTempo); // must be 140, not stale 120
    expect(tempoCalls[0][1].tempo).not.toBe(120);
  });

  // After previous test tempo is 140; use 160 BPM to guarantee a change
  it("only fires tempo:change once after rapid ticks (debounce)", () => {
    const dt = 1 / 160 / 24;
    for (let i = 0; i < 5; i++) {
      sendMsg(MIDI_STATUS_SYSTEM_TIMING_CLOCK, 0, 0, dt);
    }
    jest.advanceTimersByTime(200);

    const tempoCalls = send.mock.calls.filter(([, msg]) => msg.type === "tempo:change");
    expect(tempoCalls.length).toBe(1);
  });

  // After previous test tempo is 160; use 160 BPM again — no change, no event
  it("does not send tempo:change when tempo has not changed", () => {
    const dt = 1 / 160 / 24;
    sendMsg(MIDI_STATUS_SYSTEM_TIMING_CLOCK, 0, 0, dt);
    jest.advanceTimersByTime(200);

    const tempoCalls = send.mock.calls.filter(([, msg]) => msg.type === "tempo:change");
    expect(tempoCalls.length).toBe(0);
  });
});

// ─── Note on/off ──────────────────────────────────────────────────────────────

describe("note:on (channel 1)", () => {
  it("sends note:on with keyNumber and velocity", () => {
    sendMsg(MIDI_STATUS_CHANNEL_NOTE_ON, 60, 100);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "note:on",
      keyNumber: 60,
      velocity: 100,
    });
  });
});

describe("note:off (channel 1)", () => {
  it("sends note:off with keyNumber and velocity", () => {
    sendMsg(MIDI_STATUS_CHANNEL_NOTE_OFF, 60, 0);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "note:off",
      keyNumber: 60,
      velocity: 0,
    });
  });
});

describe("multi-channel routing", () => {
  it("ignores note:on for wrong channel", () => {
    const ch2Callback = handleMidiCallback(2);
    // Channel 2 note-on = 0x91 = 145
    ch2Callback(0, [MIDI_STATUS_CHANNEL_NOTE_ON, 60, 100]); // channel 1 msg
    // No send should have happened (channel 1 ≠ channel 2)
    const noteCalls = send.mock.calls.filter(([, msg]) => msg.type === "note:on");
    expect(noteCalls.length).toBe(0);
  });

  it("routes note:on for correct channel", () => {
    const ch2Callback = handleMidiCallback(2);
    ch2Callback(0, [MIDI_STATUS_CHANNEL_NOTE_ON + 1, 60, 100]); // channel 2 msg
    expect(send).toHaveBeenCalledWith("midi", {
      type: "note:on",
      keyNumber: 60,
      velocity: 100,
    });
  });
});

// ─── CC messages (B6 fix: controlId <= 127, not <= 13) ───────────────────────

describe("control:change", () => {
  it("sends control:change for controlId 0", () => {
    sendMsg(MIDI_STATUS_CHANNEL_CONTROL_CHANGE, 0, 64);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "control:change",
      controlId: 0,
      value: 64,
    });
  });

  it("sends control:change for controlId 13 (boundary)", () => {
    sendMsg(MIDI_STATUS_CHANNEL_CONTROL_CHANGE, 13, 100);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "control:change",
      controlId: 13,
      value: 100,
    });
  });

  it("sends control:change for controlId 14 (previously dropped — B6 fix)", () => {
    sendMsg(MIDI_STATUS_CHANNEL_CONTROL_CHANGE, 14, 50);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "control:change",
      controlId: 14,
      value: 50,
    });
  });

  it("sends control:change for controlId 64 (sustain pedal — previously dropped)", () => {
    sendMsg(MIDI_STATUS_CHANNEL_CONTROL_CHANGE, 64, 127);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "control:change",
      controlId: 64,
      value: 127,
    });
  });

  it("sends control:change for controlId 127 (max)", () => {
    sendMsg(MIDI_STATUS_CHANNEL_CONTROL_CHANGE, 127, 0);
    expect(send).toHaveBeenCalledWith("midi", {
      type: "control:change",
      controlId: 127,
      value: 0,
    });
  });

  it("does not send for controlId 128 (out of MIDI range)", () => {
    sendMsg(MIDI_STATUS_CHANNEL_CONTROL_CHANGE, 128, 0);
    const ccCalls = send.mock.calls.filter(([, msg]) => msg.type === "control:change");
    expect(ccCalls.length).toBe(0);
  });
});

// ─── Unknown status ───────────────────────────────────────────────────────────

describe("unknown status byte", () => {
  it("does not send any message for unhandled status", () => {
    sendMsg(0x00); // undefined/unsupported
    expect(send).not.toHaveBeenCalled();
  });
});
