import { EventEmitter } from "node:events";
import fs from "node:fs";
import { performance } from "node:perf_hooks";

import type { IUniverseDriver, UniverseData } from "dmx-ts";

export const CAPTURE_SCHEMA = "capture@1";
export const CAPTURE_CHANNELS = 512;

/**
 * Records every frame the DMX service sends to a `capture@1` file (JSON
 * lines) instead of a USB device: the V1 side of the PTAH V2 replay
 * oracle, compared with `ptah compare-captures`. Active only when
 * `PTAH_DMX_CAPTURE` names the file (`dmx.service.ts`).
 *
 * The first line is the header
 * `{"schema":"capture@1","source":"v1","startedWallMs":<unix ms>,"channels":512,"universe":1}`,
 * then one line per `update` / `updateAll`:
 * `{"t":<ms since init, 3 decimals>,"i":<frame counter from 0>,"d":"<base64 of the 512 channels>"}`.
 *
 * The universe buffer behaves like dmx-ts's serial drivers (513 bytes,
 * 1-based channels, values assigned as given), so the bytes are the ones
 * the Enttec driver would send.
 */
export class CaptureDriver extends EventEmitter implements IUniverseDriver {
  private readonly _universe: Buffer;
  private readonly _path: string;
  private _stream: fs.WriteStream | undefined;
  private _start: number;
  private _index: number;

  constructor(path: string) {
    super();

    this._path = path;
    this._universe = Buffer.alloc(CAPTURE_CHANNELS + 1, 0);
    this._stream = undefined;
    this._start = 0;
    this._index = 0;
  }

  async init(): Promise<void> {
    const stream = fs.createWriteStream(this._path, { flags: "w" });

    await new Promise<void>((resolve, reject) => {
      stream.once("open", () => {
        stream.off("error", reject);
        resolve();
      });
      stream.once("error", reject);
    });

    // A write error stops the capture (never the show): reported as a
    // `capture:error` event.
    stream.on("error", (error) => {
      if (this._stream === stream) {
        this._stream = undefined;
      }
      this.emit("capture:error", error);
    });

    this._stream = stream;
    this._start = performance.now();
    this._index = 0;

    stream.write(
      `${JSON.stringify({
        schema: CAPTURE_SCHEMA,
        source: "v1",
        startedWallMs: Date.now(),
        channels: CAPTURE_CHANNELS,
        universe: 1,
      })}\n`,
    );
  }

  close(): Promise<void> {
    const stream = this._stream;
    this._stream = undefined;

    if (!stream) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      stream.end(() => resolve());
    });
  }

  update(u: UniverseData, extraData?: unknown): void {
    for (const c in u) {
      this._universe[c] = u[c];
    }

    this.record();
    this.emit("update", u, extraData);
  }

  updateAll(v: number): void {
    for (let i = 1; i <= CAPTURE_CHANNELS; i++) {
      this._universe[i] = v;
    }

    this.record();
  }

  get(c: number): number {
    return this._universe[c];
  }

  private record(): void {
    if (!this._stream) {
      return;
    }

    const t = Math.round((performance.now() - this._start) * 1000) / 1000;
    const d = this._universe.subarray(1).toString("base64");

    this._stream.write(`${JSON.stringify({ t, i: this._index, d })}\n`);
    this._index += 1;
  }
}
