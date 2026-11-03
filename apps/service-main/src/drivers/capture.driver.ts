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
 *
 * Each line is written synchronously (`fs.writeSync` on the file
 * descriptor opened at `init`), so every frame recorded is in the file
 * even when the process ends with `process.exit()`. A write error stops
 * the capture (never the show) and is reported as a `capture:error`
 * event.
 */
export class CaptureDriver extends EventEmitter implements IUniverseDriver {
  private readonly _universe: Buffer;
  private readonly _path: string;
  private _fd: number | undefined;
  private _start: number;
  private _index: number;

  constructor(path: string) {
    super();

    this._path = path;
    this._universe = Buffer.alloc(CAPTURE_CHANNELS + 1, 0);
    this._fd = undefined;
    this._start = 0;
    this._index = 0;
  }

  async init(): Promise<void> {
    // A new capture: the file is created (or emptied), then only
    // appended to, one line at a time.
    const fd = fs.openSync(this._path, "w");

    this._fd = fd;
    this._start = performance.now();
    this._index = 0;

    this.write(
      `${JSON.stringify({
        schema: CAPTURE_SCHEMA,
        source: "v1",
        startedWallMs: Date.now(),
        channels: CAPTURE_CHANNELS,
        universe: 1,
      })}\n`,
    );
  }

  close(): void {
    const fd = this._fd;
    this._fd = undefined;

    if (fd !== undefined) {
      fs.closeSync(fd);
    }
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
    if (this._fd === undefined) {
      return;
    }

    const t = Math.round((performance.now() - this._start) * 1000) / 1000;
    const d = this._universe.subarray(1).toString("base64");

    this.write(`${JSON.stringify({ t, i: this._index, d })}\n`);
    this._index += 1;
  }

  private write(line: string): void {
    if (this._fd === undefined) {
      return;
    }

    try {
      fs.writeSync(this._fd, line);
    } catch (error) {
      const fd = this._fd;
      this._fd = undefined;
      try {
        fs.closeSync(fd);
      } catch {
        // Already unusable: the capture stops either way.
      }
      this.emit("capture:error", error);
    }
  }
}
